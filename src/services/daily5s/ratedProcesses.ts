import { db } from 'boot/firebase';
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { toDateKey } from 'src/utils/dateFormatting';
import type { Daily5sAuditProcessKey, Daily5sRatingValue } from 'src/types/audit';
import type { Daily5sAuditDocument } from 'src/types/daily5sDocuments';
import { isDaily5sProcessKey } from './daily5sDefinitions';

function getTodayDateString(): string {
  return toDateKey(new Date());
}

function extractRatedProcessKeys(
  aggregateGrades: Partial<Record<Daily5sAuditProcessKey, Daily5sRatingValue>> = {},
): Daily5sAuditProcessKey[] {
  return Object.keys(aggregateGrades).filter(isDaily5sProcessKey);
}

export async function getTodaysDaily5sRatedProcessKeys(): Promise<Daily5sAuditProcessKey[]> {
  return getDaily5sRatedProcessKeysByDate(getTodayDateString());
}

export async function getDaily5sRatedProcessKeysByDate(
  auditDate: string,
): Promise<Daily5sAuditProcessKey[]> {
  const auditRef = doc(db, 'daily5sAudits', auditDate);
  const auditSnapshot = await getDoc(auditRef);

  if (!auditSnapshot.exists()) {
    return [];
  }

  const auditData = auditSnapshot.data() as Partial<Daily5sAuditDocument>;

  return extractRatedProcessKeys(auditData.aggregateGrades);
}

export function subscribeDaily5sRatedProcessKeysByDate(
  auditDate: string,
  onChange: (processKeys: Daily5sAuditProcessKey[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const auditRef = doc(db, 'daily5sAudits', auditDate);

  return onSnapshot(
    auditRef,
    (auditSnapshot) => {
      const auditData = auditSnapshot.exists()
        ? (auditSnapshot.data() as Partial<Daily5sAuditDocument>)
        : null;

      onChange(extractRatedProcessKeys(auditData?.aggregateGrades));
    },
    (error) => {
      onError?.(error);
    },
  );
}
