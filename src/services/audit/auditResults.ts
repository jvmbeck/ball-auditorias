import { db } from 'boot/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AuditDocument, AuditResultDocument, UpdatableProcessStatus } from 'src/types/audit';

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
  const writes = Object.entries(audit.processes).map(([processKey, process]) => {
    // Use `updated` as a safe fallback for any process left in a null state at completion.
    const status = (process.status ?? 'updated') as UpdatableProcessStatus;

    const payload: AuditResultDocument = {
      auditId,
      auditorId: audit.auditorId,
      processKey,
      status,
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
