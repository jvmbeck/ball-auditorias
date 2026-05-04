import { db } from 'boot/firebase';
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import type {
  AuditServiceConfig,
  AuditType,
  DualAuditProcessKey,
  DualTypeAuditDocument,
  DualTypeAuditResultDocument,
  DualTypeHistoryItem,
} from 'src/types/audit';

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveDayOfWeek(dateStr: string): string {
  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  // Use UTC noon to avoid timezone shifts flipping the date.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
}

function deriveYearMonth(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${year}-${month}`;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function toCompletedAtDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function toHistoryItem(
  auditId: string,
  auditDoc: DualTypeAuditDocument,
  type: AuditType,
  results: DualTypeAuditResultDocument[],
  completedAt: Date | null,
): DualTypeHistoryItem {
  const processes = Object.fromEntries(
    results.map((result) => [result.process, result]),
  ) as Partial<Record<DualAuditProcessKey, DualTypeAuditResultDocument>>;

  const failedProcesses = results.filter((result) => result.hasIssue).length;
  const totalProcesses = results.length;
  const turma = auditDoc.turma === 'A e C' || auditDoc.turma === 'B e D' ? auditDoc.turma : null;

  return {
    id: auditId,
    type,
    turma,
    date: auditDoc.date,
    dayOfWeek: deriveDayOfWeek(auditDoc.date),
    yearMonth: deriveYearMonth(auditDoc.date),
    completedAt,
    failedProcesses,
    totalProcesses,
    hasFailures: failedProcesses > 0,
    processes,
  };
}

function groupDaily5sHistoryItems(
  auditDocs: Array<DualTypeAuditDocument & { id: string }>,
  resultsByAuditId: Map<string, DualTypeAuditResultDocument[]>,
): DualTypeHistoryItem[] {
  const auditsByDayId = new Map<string, Array<DualTypeAuditDocument & { id: string }>>();

  auditDocs.forEach((auditDoc) => {
    const dayId = auditDoc.auditSessionId || auditDoc.date || auditDoc.id;
    const list = auditsByDayId.get(dayId) ?? [];
    list.push(auditDoc);
    auditsByDayId.set(dayId, list);
  });

  return [...auditsByDayId.entries()].map(([dayId, groupedAudits]) => {
    const sortedAudits = [...groupedAudits].sort((left, right) => {
      const leftTime = toCompletedAtDate(left.completedAt)?.getTime() ?? 0;
      const rightTime = toCompletedAtDate(right.completedAt)?.getTime() ?? 0;
      return leftTime - rightTime;
    });

    const latestAudit = sortedAudits[sortedAudits.length - 1];

    if (!latestAudit) {
      throw new Error(`Missing completed Daily 5S audit for day ${dayId}.`);
    }

    const mergedResults = new Map<DualAuditProcessKey, DualTypeAuditResultDocument>();

    sortedAudits.forEach((auditDoc) => {
      const results = resultsByAuditId.get(auditDoc.id) ?? [];
      results.forEach((result) => {
        mergedResults.set(result.process, result);
      });
    });

    return toHistoryItem(
      dayId,
      latestAudit,
      'daily5s',
      [...mergedResults.values()],
      toCompletedAtDate(latestAudit.completedAt),
    );
  });
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Loads completed audit history for a specific audit type and inspector.
 *
 * Steps:
 * 1. Fetch all audit header documents from the type-specific collection filtered by inspector.
 * 2. Filter client-side for those with a `completedAt` timestamp (avoids composite index).
 * 3. Batch-fetch all process result documents using `auditId in [...]` chunks.
 * 4. Map audit headers + results into `DualTypeHistoryItem[]` sorted newest first.
 *
 * @param inspectorId Authenticated user ID
 * @param type        Audit type ('rto' or 'board5s')
 * @param config      Collection names for this audit type
 */
export async function getCompletedAuditHistory(
  inspectorId: string,
  type: AuditType,
  config: AuditServiceConfig,
): Promise<DualTypeHistoryItem[]> {
  // 1. Fetch all audits for this inspector
  const auditsQuery = query(
    collection(db, config.auditCollection),
    where('inspector', '==', inspectorId),
  );
  const auditsSnapshot = await getDocs(auditsQuery);

  // 2. Filter to completed audits (completedAt is set) — client-side avoids composite index
  const auditDocs = auditsSnapshot.docs
    .map((snap) => ({ id: snap.id, ...(snap.data() as DualTypeAuditDocument) }))
    .filter((a) => a.completedAt != null);

  if (!auditDocs.length) {
    return [];
  }

  // 3. Batch-fetch process results for all completed audit IDs
  const FIRESTORE_IN_LIMIT = 30;
  const auditIds = auditDocs.map((a) => a.id);
  const allResults: DualTypeAuditResultDocument[] = [];

  for (const chunk of chunkArray(auditIds, FIRESTORE_IN_LIMIT)) {
    const resultsQuery = query(
      collection(db, config.resultsCollection),
      where('auditId', 'in', chunk),
    );
    const snapshot = await getDocs(resultsQuery);
    snapshot.forEach((doc) => allResults.push(doc.data() as DualTypeAuditResultDocument));
  }

  // 4. Group results by auditId
  const resultsByAuditId = new Map<string, DualTypeAuditResultDocument[]>();
  for (const result of allResults) {
    const list = resultsByAuditId.get(result.auditId) ?? [];
    list.push(result);
    resultsByAuditId.set(result.auditId, list);
  }

  // 5. Map to DualTypeHistoryItem
  const items: DualTypeHistoryItem[] =
    type === 'daily5s'
      ? groupDaily5sHistoryItems(auditDocs, resultsByAuditId)
      : auditDocs.map((auditDoc) =>
          toHistoryItem(
            auditDoc.id,
            auditDoc,
            type,
            resultsByAuditId.get(auditDoc.id) ?? [],
            toCompletedAtDate(auditDoc.completedAt),
          ),
        );

  // Sort newest first
  items.sort((a, b) => {
    const aTime = a.completedAt?.getTime() ?? 0;
    const bTime = b.completedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return items;
}
