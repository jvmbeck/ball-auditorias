import { db } from 'boot/firebase';
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { toDateKey } from 'src/utils/dateFormatting';
import type {
  Daily5sAuditProcessKey,
  Daily5sRatingValue,
  DualTypeAuditDocument,
  DualTypeAuditResultDocument,
} from 'src/types/audit';
import { isDaily5sProcessKey } from './daily5sDefinitions';

function getTodayDateString(): string {
  return toDateKey(new Date());
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }

  return chunks;
}

function normalizeRating(
  rating: unknown,
  status: DualTypeAuditResultDocument['status'],
): Daily5sRatingValue {
  if (rating === 1 || rating === 3 || rating === 5) {
    return rating;
  }

  return status === 'not_updated' ? 1 : 5;
}

export interface Daily5sTodayStatus {
  auditId: string;
  turma: 'A e C' | 'B e D' | null;
  completed: boolean;
  ratedProcessKeys: Daily5sAuditProcessKey[];
}

export interface Daily5sPersistedResult {
  process: Daily5sAuditProcessKey;
  rating: Daily5sRatingValue;
  comment: string;
}

export async function getTodaysDaily5sStatus(
  inspectorId: string,
): Promise<Daily5sTodayStatus | null> {
  const dayId = getTodayDateString();
  const auditsQuery = query(
    collection(db, 'daily5sAudits'),
    where('inspector', '==', inspectorId),
    where('auditSessionId', '==', dayId),
  );
  const auditsSnapshot = await getDocs(auditsQuery);

  if (auditsSnapshot.empty) {
    return null;
  }

  const audits = auditsSnapshot.docs.map((snapshot) => {
    const data = snapshot.data() as DualTypeAuditDocument;
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().getTime() : 0;
    const completedAt =
      data.completedAt instanceof Timestamp ? data.completedAt.toDate().getTime() : null;

    return {
      id: snapshot.id,
      data,
      createdAt,
      completedAt,
    };
  });

  const inProgressAudit = audits
    .filter(({ completedAt }) => completedAt == null)
    .sort((left, right) => right.createdAt - left.createdAt)[0];

  const latestCompletedAudit = audits
    .filter(({ completedAt }) => completedAt != null)
    .sort((left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0))[0];

  const activeAudit = inProgressAudit ?? latestCompletedAudit;

  if (!activeAudit) {
    return null;
  }

  const auditId = activeAudit.id;
  const auditData = activeAudit.data;
  const processKeys = new Set<Daily5sAuditProcessKey>();

  for (const auditIdChunk of chunkArray(
    audits.map(({ id }) => id),
    30,
  )) {
    const resultsQuery = query(
      collection(db, 'daily5sProcessResults'),
      where('auditId', 'in', auditIdChunk),
    );
    const resultSnapshots = await getDocs(resultsQuery);

    resultSnapshots.forEach((snapshot) => {
      const data = snapshot.data() as Partial<DualTypeAuditResultDocument>;
      if (typeof data.process !== 'string' || !isDaily5sProcessKey(data.process)) {
        return;
      }

      processKeys.add(data.process);
    });
  }

  return {
    auditId,
    turma: auditData.turma ?? null,
    completed: activeAudit.completedAt != null,
    ratedProcessKeys: [...processKeys],
  };
}

export async function getDaily5sResultsForAudit(
  auditId: string,
): Promise<Daily5sPersistedResult[]> {
  const resultsQuery = query(
    collection(db, 'daily5sProcessResults'),
    where('auditId', '==', auditId),
  );
  const resultSnapshots = await getDocs(resultsQuery);

  const results: Daily5sPersistedResult[] = [];

  resultSnapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<DualTypeAuditResultDocument>;

    if (typeof data.process !== 'string' || !isDaily5sProcessKey(data.process) || !data.status) {
      return;
    }

    results.push({
      process: data.process,
      rating: normalizeRating(data.rating, data.status),
      comment: data.comment?.trim() ?? '',
    });
  });

  return results;
}
