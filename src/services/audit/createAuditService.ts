import { db, storage } from 'boot/firebase';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type FieldValue,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type {
  AuditServiceConfig,
  DualAuditProcessKey,
  DualTypeAuditDocument,
  DualTypeAuditResultDocument,
  UpdatableProcessStatus,
} from 'src/types/audit';

/**
 * Creates a reusable audit service factory that handles all database operations
 * for a specific audit type (checklist or board).
 *
 * @param config Configuration object with collection names
 * @returns Object with methods for managing audits
 */
export function createAuditService(config: AuditServiceConfig) {
  /**
   * Uploads an image to Firebase Storage and returns its download URL.
   *
   * Path format: `audits/{auditType}/{auditId}/{processKey}/{timestamp}.jpg`
   */
  async function uploadImage(
    auditId: string,
    processKey: DualAuditProcessKey,
    file: File,
  ): Promise<string> {
    const fileName = `${Date.now()}.jpg`;
    const storagePath = `audits/${config.auditCollection}/${auditId}/${processKey}/${fileName}`;
    const imageRef = ref(storage, storagePath);

    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  }

  /**
   * Creates a new audit document.
   *
   * Uses date (YYYY-MM-DD) as document ID to ensure one audit per day.
   *
   * @param auditSessionId Unique session identifier (can be same as date for now)
   * @param date Date string in YYYY-MM-DD format
   * @param inspector User ID of the inspector
   * @returns Document ID (same as date)
   */
  async function createAudit(
    auditSessionId: string,
    date: string,
    turma: 'A e C' | 'B e D',
    inspector: string,
  ): Promise<string> {
    const payload: Omit<DualTypeAuditDocument, 'createdAt'> & { createdAt: FieldValue } = {
      auditSessionId,
      date,
      turma,
      inspector,
      createdAt: serverTimestamp(),
    };

    const auditRef = doc(db, config.auditCollection, date);
    await setDoc(auditRef, payload, { merge: true });

    return date;
  }

  /**
   * Updates a single process in an audit and creates a result document.
   *
   * If status is 'not_updated', image and comment are required.
   * Uploads image to Storage if provided.
   *
   * @param auditId Date string (YYYY-MM-DD)
   * @param auditSessionId Session identifier
   * @param processKey Process to update
   * @param status Process status
   * @param comment Optional comment
   * @param imageFile Optional image file
   */
  async function updateProcess(
    auditId: string,
    auditSessionId: string,
    turma: 'A e C' | 'B e D',
    processKey: DualAuditProcessKey,
    status: UpdatableProcessStatus,
    comment: string | null = null,
    imageFile: File | null = null,
  ): Promise<void> {
    let imageUrl: string | null = null;

    // Upload image if provided
    if (imageFile) {
      imageUrl = await uploadImage(auditId, processKey, imageFile);
    }

    // Determine if this process has an issue
    const hasIssue = status === 'not_updated';

    // Create result document
    const resultPayload: DualTypeAuditResultDocument = {
      auditId,
      auditSessionId,
      date: auditId,
      turma,
      process: processKey,
      status,
      hasIssue,
      comment: hasIssue ? comment?.trim() || null : null,
      imageUrl: hasIssue ? imageUrl : null,
      createdAt: serverTimestamp(),
    };

    const resultId = `${auditId}_${processKey}`;
    const resultRef = doc(db, config.resultsCollection, resultId);
    await setDoc(resultRef, resultPayload, { merge: true });
  }

  /**
   * Completes an audit by adding completedAt timestamp.
   *
   * @param auditId Date string (YYYY-MM-DD)
   */
  async function completeAudit(auditId: string): Promise<void> {
    const auditRef = doc(db, config.auditCollection, auditId);
    const snapshot = await getDoc(auditRef);

    if (!snapshot.exists()) {
      throw new Error(`Audit ${auditId} does not exist.`);
    }

    await updateDoc(auditRef, {
      completedAt: serverTimestamp(),
    });
  }

  // Public API
  return {
    createAudit,
    updateProcess,
    completeAudit,
    uploadImage,
  };
}
