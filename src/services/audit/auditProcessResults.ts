import { db } from 'boot/firebase';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import type { DualAuditProcessKey, DualTypeAuditResultDocument } from 'src/types/audit';

function getCreatedAtMs(value: unknown): number {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  return 0;
}

/**
 * Checks if a process result document exists for the given audit and process.
 *
 * Document ID format: `{auditId}_{processKey}`
 *
 * @param resultsCollection Collection name (e.g., 'rtoProcessResults' or 'board5sProcessResults')
 * @param auditId Audit document ID (date in YYYY-MM-DD format)
 * @param processKey The process key to check
 * @returns true if document exists, false otherwise
 */
export async function isProcessSaved(
  resultsCollection: string,
  auditId: string,
  processKey: DualAuditProcessKey,
): Promise<boolean> {
  const docId = `${auditId}_${processKey}`;
  const docRef = doc(db, resultsCollection, docId);
  const docSnapshot = await getDoc(docRef);
  return docSnapshot.exists();
}

/**
 * Retrieves a process result document.
 *
 * @param resultsCollection Collection name
 * @param auditId Audit document ID
 * @param processKey The process key
 * @returns The result document data or null if not found
 */
export async function getProcessResult(
  resultsCollection: string,
  auditId: string,
  processKey: DualAuditProcessKey,
): Promise<DualTypeAuditResultDocument | null> {
  const docId = `${auditId}_${processKey}`;
  const docRef = doc(db, resultsCollection, docId);
  const docSnapshot = await getDoc(docRef);

  if (!docSnapshot.exists()) {
    return null;
  }

  return docSnapshot.data() as DualTypeAuditResultDocument;
}

/**
 * Retrieves the latest Daily5S process result by date + turma + process key.
 *
 * This is used by analytics screens where the canonical date is known,
 * but the persisted auditId may include a UUID suffix.
 */
export async function getLatestDaily5sProcessResultByDate(
  date: string,
  processKey: DualAuditProcessKey,
): Promise<DualTypeAuditResultDocument | null> {
  const daily5sQuery = query(collection(db, 'daily5sProcessResults'), where('date', '==', date));
  const snapshots = await getDocs(daily5sQuery);

  let latestCreatedAtMs = -1;
  let latestData: DualTypeAuditResultDocument | null = null;

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<DualTypeAuditResultDocument>;

    if (data.process !== processKey) {
      return;
    }

    const createdAtMs = getCreatedAtMs(data.createdAt);
    const normalized = data as DualTypeAuditResultDocument;

    if (createdAtMs >= latestCreatedAtMs) {
      latestCreatedAtMs = createdAtMs;
      latestData = normalized;
    }
  });

  return latestData;
}

/**
 * Fetches all process results for a given audit.
 *
 * @param resultsCollection Collection name
 * @param auditId Audit document ID
 * @returns Array of all process results for this audit
 */
export async function getAuditProcessResults(
  resultsCollection: string,
  auditId: string,
): Promise<DualTypeAuditResultDocument[]> {
  const collectionRef = collection(db, resultsCollection);
  const q = query(collectionRef, where('auditId', '==', auditId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data() as DualTypeAuditResultDocument);
}

/**
 * Checks which processes in the given list have been saved.
 *
 * @param resultsCollection Collection name
 * @param auditId Audit document ID
 * @param processKeys List of process keys to check
 * @returns Map of processKey to boolean (true if saved)
 */
export async function getProcessSavedStatus(
  resultsCollection: string,
  auditId: string,
  processKeys: DualAuditProcessKey[],
): Promise<Record<DualAuditProcessKey, boolean>> {
  const results = await getAuditProcessResults(resultsCollection, auditId);
  const savedProcesses = new Set(results.map((r) => r.process));

  const statusMap: Record<DualAuditProcessKey, boolean> = {} as Record<
    DualAuditProcessKey,
    boolean
  >;
  for (const processKey of processKeys) {
    statusMap[processKey] = savedProcesses.has(processKey);
  }

  return statusMap;
}
