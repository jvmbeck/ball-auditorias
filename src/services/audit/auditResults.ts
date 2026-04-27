import { db } from 'boot/firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type {
  AuditProcess,
  AuditDocument,
  RtoAuditProcessKey,
  rtoAuditResultDocument,
  UpdatableProcessStatus,
  DualTypeAuditDocument,
} from 'src/types/audit';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date in YYYY-MM-DD format to match Firestore document IDs
 */
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates one analytics document in `auditResults` for each process in the given audit.
 *
 * Document ID format: `{auditId}_{processKey}`
 *
 * These flat, denormalized records are designed for efficient analytical queries:
 *  - Find all failed inspections across the plant
 *  - Find the most frequently failing process type
 *  - Track failure rates over time
 *  - Filter failures by auditor or date range
 *
 * This function is called internally by `completeAudit` and should not be called directly.
 *
 * @param auditId Completed audit document ID
 * @param audit   Full audit document data (auditorId and processes are required)
 */
export async function createAuditResults(auditId: string, audit: AuditDocument): Promise<void> {
  const auditDate = audit.createdAt?.toDate ? audit.createdAt.toDate() : new Date();
  const dateKey = toDateKey(auditDate);

  const processEntries = Object.entries(audit.processes) as Array<
    [RtoAuditProcessKey, AuditProcess]
  >;

  const writes = processEntries.map(([processKey, process]) => {
    // Use `updated` as a safe fallback for any process left in a null state at completion.
    const status = (process.status ?? 'updated') as UpdatableProcessStatus;

    const payload: rtoAuditResultDocument = {
      auditId,
      auditorId: audit.auditorId,
      turma: audit.turma,
      dayOfWeek: audit.dayOfWeek,
      yearMonth: audit.yearMonth,
      date: dateKey,
      process: processKey,
      processKey,
      status,
      hasIssue: status === 'not_updated',
      createdAt: serverTimestamp(),
      hasImage: Boolean(process.imageUrl),
    };

    // Document ID encodes both the audit and the process for easy point lookups.
    const resultRef = doc(db, 'auditResults', `${auditId}_${processKey}`);
    return setDoc(resultRef, payload);
  });

  // Fan out all writes in parallel — each process is independent.
  await Promise.all(writes);
}

/**
 * Checks if an audit document exists for today in either collection.
 * Returns information about the first audit found with its completion status.
 *
 * @returns Object with auditId, turma, and completed status; null if no audit found
 */
export async function checkTodaysAudit(): Promise<{
  auditId: string;
  turma: 'A e C' | 'B e D' | null;
  completed: boolean;
} | null> {
  const dateString = getTodayDateString();
  const collectionsToCheck = ['rtoAudits', 'board5sAudits'];

  for (const collectionName of collectionsToCheck) {
    const docRef = doc(db, collectionName, dateString);
    const docSnapshot = await getDoc(docRef);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data() as DualTypeAuditDocument;
      return {
        auditId: dateString,
        turma: data.turma || null,
        completed: !!data.completedAt,
      };
    }
  }

  return null;
}
