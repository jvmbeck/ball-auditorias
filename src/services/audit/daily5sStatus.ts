import { db } from 'boot/firebase';
import {
  Timestamp,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { toDateKey } from 'src/utils/dateFormatting';
import type {
  Daily5sAuditProcessKey,
  Daily5sRatingValue,
  DualTypeAuditDocument,
  DualTypeAuditResultDocument,
} from 'src/types/audit';
import { isDaily5sIssueReason, isDaily5sProcessKey } from './daily5sDefinitions';

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
  grade1Reason: string[];
  grade1Comment: string;
}

function normalizeGrade1Reason(result: Partial<DualTypeAuditResultDocument>): string[] {
  const reason = result.grade1Reason;

  if (Array.isArray(reason)) {
    return reason.filter((value): value is (typeof reason)[number] => isDaily5sIssueReason(value));
  }

  if (typeof reason === 'string' && isDaily5sIssueReason(reason)) {
    return [reason];
  }

  const legacyComment = result.comment;
  if (typeof legacyComment === 'string' && isDaily5sIssueReason(legacyComment)) {
    return [legacyComment];
  }

  return [];
}

function normalizeGrade1Comment(result: Partial<DualTypeAuditResultDocument>): string {
  const value = result.grade1Comment;
  return typeof value === 'string' ? value.trim() : '';
}

export async function getTodaysDaily5sRatedProcessKeys(): Promise<Daily5sAuditProcessKey[]> {
  return getDaily5sRatedProcessKeysByDate(getTodayDateString());
}

export async function getDaily5sRatedProcessKeysByDate(
  dayId: string,
): Promise<Daily5sAuditProcessKey[]> {
  const resultsQuery = query(collection(db, 'daily5sProcessResults'), where('date', '==', dayId));
  const resultSnapshots = await getDocs(resultsQuery);
  const processKeys = new Set<Daily5sAuditProcessKey>();

  resultSnapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<DualTypeAuditResultDocument>;

    if (typeof data.process !== 'string' || !isDaily5sProcessKey(data.process)) {
      return;
    }

    processKeys.add(data.process);
  });

  return [...processKeys];
}

export function subscribeTodaysDaily5sRatedProcessKeys(
  onChange: (processKeys: Daily5sAuditProcessKey[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeDaily5sRatedProcessKeysByDate(getTodayDateString(), onChange, onError);
}

export function subscribeDaily5sRatedProcessKeysByDate(
  dayId: string,
  onChange: (processKeys: Daily5sAuditProcessKey[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const resultsQuery = query(collection(db, 'daily5sProcessResults'), where('date', '==', dayId));

  return onSnapshot(
    resultsQuery,
    (resultSnapshots) => {
      const processKeys = new Set<Daily5sAuditProcessKey>();

      resultSnapshots.forEach((snapshot) => {
        const data = snapshot.data() as Partial<DualTypeAuditResultDocument>;

        if (typeof data.process !== 'string' || !isDaily5sProcessKey(data.process)) {
          return;
        }

        processKeys.add(data.process);
      });

      onChange([...processKeys]);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}

export async function getTodaysDaily5sStatus(
  inspectorId: string,
): Promise<Daily5sTodayStatus | null> {
  return getDaily5sStatusByDate(inspectorId, getTodayDateString());
}

export async function getDaily5sStatusByDate(
  inspectorId: string,
  dayId: string,
): Promise<Daily5sTodayStatus | null> {
  const auditsQuery = query(
    collection(db, 'daily5sAudits'),
    where('inspector', '==', inspectorId),
    where('date', '==', dayId),
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
      grade1Reason: normalizeGrade1Reason(data),
      grade1Comment: normalizeGrade1Comment(data),
    });
  });

  return results;
}
