import { db } from 'boot/firebase';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
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
  const auditRef = doc(db, 'daily5sAudits', dayId);
  const auditSnapshot = await getDoc(auditRef);

  if (!auditSnapshot.exists()) {
    return [];
  }

  const auditData = auditSnapshot.data() as Partial<DualTypeAuditDocument>;
  const aggregateGrades = auditData.aggregateGrades ?? {};
  const processKeys = new Set<Daily5sAuditProcessKey>();

  Object.keys(aggregateGrades).forEach((processKey) => {
    if (isDaily5sProcessKey(processKey)) {
      processKeys.add(processKey);
    }
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
  const auditRef = doc(db, 'daily5sAudits', dayId);

  return onSnapshot(
    auditRef,
    (auditSnapshot) => {
      const processKeys = new Set<Daily5sAuditProcessKey>();
      const auditData = auditSnapshot.exists()
        ? (auditSnapshot.data() as Partial<DualTypeAuditDocument>)
        : null;
      const aggregateGrades = auditData?.aggregateGrades ?? {};

      Object.keys(aggregateGrades).forEach((processKey) => {
        if (isDaily5sProcessKey(processKey)) {
          processKeys.add(processKey);
        }
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
  void inspectorId;
  return getDaily5sStatusByDate(inspectorId, getTodayDateString());
}

export async function getDaily5sStatusByDate(
  inspectorId: string,
  dayId: string,
): Promise<Daily5sTodayStatus | null> {
  void inspectorId;

  const auditRef = doc(db, 'daily5sAudits', dayId);
  const auditSnapshot = await getDoc(auditRef);

  if (!auditSnapshot.exists()) {
    return null;
  }

  const auditData = auditSnapshot.data() as DualTypeAuditDocument;
  const completed = auditData.completedAt instanceof Timestamp;

  const aggregateGrades = auditData.aggregateGrades ?? {};
  const processKeys = new Set<Daily5sAuditProcessKey>();

  Object.keys(aggregateGrades).forEach((processKey) => {
    if (isDaily5sProcessKey(processKey)) {
      processKeys.add(processKey);
    }
  });

  return {
    auditId: dayId,
    turma: auditData.turma ?? null,
    completed,
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
