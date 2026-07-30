import {
  doc,
  onSnapshot,
  type Unsubscribe,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';

import { db } from 'src/boot/firebase';
import type { Daily5sAuditDocument } from 'src/types/daily5sDocuments';

const DAILY5S_AUDITS_COLLECTION = 'daily5sAudits';
export function subscribeDaily5sAuditByDate(
  date: string,
  onChange: (audit: Daily5sAuditDocument | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const auditRef = doc(db, DAILY5S_AUDITS_COLLECTION, date);

  return onSnapshot(
    auditRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      const auditData = snapshot.data() as Daily5sAuditDocument;

      onChange(auditData);
    },
    (error) => {
      onError?.(error);
    },
  );
}
export async function getPreviousDaily5sAudit(
  currentDate: string,
): Promise<Daily5sAuditDocument | null> {
  const auditsRef = collection(db, DAILY5S_AUDITS_COLLECTION);

  const previousAuditQuery = query(
    auditsRef,
    where('date', '<', currentDate),
    orderBy('date', 'desc'),
    limit(1),
  );

  const snapshot = await getDocs(previousAuditQuery);
  const previousAuditSnapshot = snapshot.docs[0];

  if (!previousAuditSnapshot) {
    return null;
  }

  return previousAuditSnapshot.data() as Daily5sAuditDocument;
}
