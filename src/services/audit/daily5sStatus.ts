import { db } from 'boot/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
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
  const auditId = getTodayDateString();
  const auditRef = doc(db, 'daily5sAudits', auditId);
  const auditSnapshot = await getDoc(auditRef);

  if (!auditSnapshot.exists()) {
    return null;
  }

  const auditData = auditSnapshot.data() as DualTypeAuditDocument;

  if (auditData.inspector !== inspectorId) {
    return null;
  }

  const resultsQuery = query(collection(db, 'daily5sProcessResults'), where('auditId', '==', auditId));
  const resultSnapshots = await getDocs(resultsQuery);

  const processKeys = new Set<Daily5sAuditProcessKey>();

  resultSnapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<DualTypeAuditResultDocument>;
    if (typeof data.process !== 'string' || !isDaily5sProcessKey(data.process)) {
      return;
    }

    processKeys.add(data.process);
  });

  return {
    auditId,
    turma: auditData.turma ?? null,
    completed: Boolean(auditData.completedAt),
    ratedProcessKeys: [...processKeys],
  };
}

export async function getDaily5sResultsForAudit(auditId: string): Promise<Daily5sPersistedResult[]> {
  const resultsQuery = query(collection(db, 'daily5sProcessResults'), where('auditId', '==', auditId));
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
