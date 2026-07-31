import { db } from 'boot/firebase';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import type { Daily5sAuditProcessKey } from 'src/types/audit';
import type { Daily5sProcessResultDocument } from 'src/types/daily5sDocuments';

const RESULTS_COLLECTION = 'daily5sProcessResults';

/**
 * Retrieves the saved result for a process on a given audit date.
 * Supports both current deterministic IDs and legacy randomized IDs.
 */
export async function getProcessResultByDate(
  date: string,
  processKey: Daily5sAuditProcessKey,
): Promise<Daily5sProcessResultDocument | null> {
  const currentId = `${date}_${processKey}`;
  const currentRef = doc(db, RESULTS_COLLECTION, currentId);
  const currentSnapshot = await getDoc(currentRef);

  if (currentSnapshot.exists()) {
    return currentSnapshot.data() as Daily5sProcessResultDocument;
  }

  const legacyQuery = query(
    collection(db, RESULTS_COLLECTION),
    where('date', '==', date),
    where('process', '==', processKey),
    limit(1),
  );

  const legacySnapshot = await getDocs(legacyQuery);
  const legacyDocument = legacySnapshot.docs[0];

  if (!legacyDocument) {
    return null;
  }

  return legacyDocument.data() as Daily5sProcessResultDocument;
}
