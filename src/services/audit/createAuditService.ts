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
  Daily5sRatingValue,
  DualAuditProcessKey,
  DualTypeAuditDocument,
  DualTypeAuditResultDocument,
  PrinterCheckKey,
  PrinterChecks,
  UpdatableProcessStatus,
} from 'src/types/audit';

interface UpdateProcessOptions {
  issueTargets?: PrinterCheckKey[];
  printerChecks?: PrinterChecks;
  printerFiles?: Partial<Record<PrinterCheckKey, File[] | null>>;
  rating?: Daily5sRatingValue;
}

function normalizeImageUrls(imageUrls: unknown, imageUrl: unknown): string[] {
  const normalized = new Set<string>();

  if (Array.isArray(imageUrls)) {
    imageUrls.forEach((value) => {
      if (typeof value === 'string' && value.length > 0) {
        normalized.add(value);
      }
    });
  }

  if (typeof imageUrl === 'string' && imageUrl.length > 0) {
    normalized.add(imageUrl);
  }

  return [...normalized];
}

/**
 * Creates a reusable audit service factory that handles all database operations
 * for a specific audit type (checklist or board).
 *
 * @param config Configuration object with collection names
 * @returns Object with methods for managing audits
 */
export function createAuditService(config: AuditServiceConfig) {
  function createUniqueFileName(file: File): string {
    const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const randomSuffix =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Math.random().toString(36).slice(2)}_${Date.now()}`;

    return `${Date.now()}_${randomSuffix}_${safeOriginalName}`;
  }

  /**
   * Uploads an image to Firebase Storage and returns its download URL.
   *
   * Path format: `audits/{auditType}/{auditId}/{processKey}/{timestamp}_{uuid}_{filename}`
   */
  async function uploadImage(
    auditId: string,
    processKey: DualAuditProcessKey,
    file: File,
    evaluationType?: string,
  ): Promise<string> {
    const fileName = createUniqueFileName(file);
    const evaluationPath = evaluationType ? `/${evaluationType}` : '';
    const storagePath = `audits/${config.auditCollection}/${auditId}/${processKey}${evaluationPath}/${fileName}`;
    const imageRef = ref(storage, storagePath);

    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  }

  /**
   * Creates a new audit document.
   *
   * Uses the provided audit ID as the document ID. The optional session ID can
   * remain stable across multiple audit documents from the same day.
   *
   * @param auditId Unique audit document identifier
   * @param date Date string in YYYY-MM-DD format
   * @param auditSessionId Stable day/session identifier used to group related audits
   * @param inspector User ID of the inspector
   * @returns Document ID
   */
  async function createAudit(
    auditId: string,
    date: string,
    turma: 'A e C' | 'B e D',
    inspector: string,
    auditSessionId = date,
  ): Promise<string> {
    const payload: Omit<DualTypeAuditDocument, 'createdAt'> & { createdAt: FieldValue } = {
      auditSessionId,
      date,
      turma,
      inspector,
      createdAt: serverTimestamp(),
    };

    const auditRef = doc(db, config.auditCollection, auditId);
    await setDoc(auditRef, payload, { merge: true });

    return auditId;
  }

  /**
   * Updates a single process in an audit and creates a result document.
   *
   * If status is 'not_updated', image and comment are required.
   * Uploads images to Storage if provided.
   *
   * @param auditId Audit document identifier
   * @param auditSessionId Stable day/session identifier
   * @param processKey Process to update
   * @param status Process status
   * @param comment Optional comment
   * @param imageFiles Optional image files
   */
  async function updateProcess(
    auditId: string,
    auditSessionId: string,
    turma: 'A e C' | 'B e D',
    processKey: DualAuditProcessKey,
    status: UpdatableProcessStatus,
    comment: string | null = null,
    imageFiles: File[] | null = null,
    options?: UpdateProcessOptions,
  ): Promise<void> {
    const resultId = `${auditId}_${processKey}`;
    const resultRef = doc(db, config.resultsCollection, resultId);
    const existingResultSnapshot = await getDoc(resultRef);
    const existingResult = existingResultSnapshot.exists()
      ? (existingResultSnapshot.data() as Partial<DualTypeAuditResultDocument>)
      : null;

    let processImageUrls = normalizeImageUrls(existingResult?.imageUrls, existingResult?.imageUrl);
    let printerChecks = options?.printerChecks ?? null;

    // Upload process images, preserving previous ones.
    if (status === 'not_updated' && imageFiles?.length) {
      const uploadedImageUrls = await Promise.all(
        imageFiles.map((file) => uploadImage(auditId, processKey, file)),
      );
      processImageUrls = [...processImageUrls, ...uploadedImageUrls];
    }

    if (status !== 'not_updated') {
      processImageUrls = [];
    }

    if (printerChecks && options?.printerFiles) {
      const existingPrinterChecks = existingResult?.printerChecks ?? null;
      const printerEntries = Object.entries(printerChecks) as Array<
        [PrinterCheckKey, PrinterChecks[PrinterCheckKey]]
      >;

      const uploadedPrinterChecks = await Promise.all(
        printerEntries.map(async ([printerKey, printerCheck]) => {
          const printerFiles = options.printerFiles?.[printerKey] ?? null;

          const existingImageUrls = normalizeImageUrls(
            existingPrinterChecks?.[printerKey]?.imageUrls,
            existingPrinterChecks?.[printerKey]?.imageUrl,
          );

          if (printerCheck.status === 'not_updated') {
            const uploadedImageUrls = printerFiles?.length
              ? await Promise.all(
                  printerFiles.map((printerFile) =>
                    uploadImage(auditId, processKey, printerFile, printerKey),
                  ),
                )
              : [];
            const mergedImageUrls = [...existingImageUrls, ...uploadedImageUrls];

            return [
              printerKey,
              {
                ...printerCheck,
                imageUrl: mergedImageUrls[0] ?? null,
                imageUrls: mergedImageUrls,
              },
            ] as const;
          }

          return [
            printerKey,
            {
              ...printerCheck,
              imageUrl: null,
              imageUrls: [],
            },
          ] as const;
        }),
      );

      printerChecks = Object.fromEntries(uploadedPrinterChecks) as PrinterChecks;
    }

    if (printerChecks && !options?.printerFiles) {
      const printerEntries = Object.entries(printerChecks) as Array<
        [PrinterCheckKey, PrinterChecks[PrinterCheckKey]]
      >;
      const normalizedPrinterChecks = Object.fromEntries(
        printerEntries.map(([printerKey, printerCheck]) => {
          const normalizedUrls = normalizeImageUrls(printerCheck.imageUrls, printerCheck.imageUrl);

          return [
            printerKey,
            {
              ...printerCheck,
              imageUrl: normalizedUrls[0] ?? null,
              imageUrls: normalizedUrls,
            },
          ];
        }),
      ) as PrinterChecks;

      printerChecks = normalizedPrinterChecks;
    }

    if (!printerChecks && existingResult?.printerChecks) {
      const printerEntries = Object.entries(existingResult.printerChecks) as Array<
        [PrinterCheckKey, PrinterChecks[PrinterCheckKey]]
      >;
      const normalizedPrinterChecks = Object.fromEntries(
        printerEntries.map(([printerKey, printerCheck]) => {
          const normalizedUrls = normalizeImageUrls(printerCheck.imageUrls, printerCheck.imageUrl);

          return [
            printerKey,
            {
              ...printerCheck,
              imageUrl: normalizedUrls[0] ?? null,
              imageUrls: normalizedUrls,
            },
          ];
        }),
      ) as PrinterChecks;

      printerChecks = normalizedPrinterChecks;
    }

    const normalizedProcessImageUrls = normalizeImageUrls(processImageUrls, null);

    // Determine if this process has an issue
    const hasIssue = status === 'not_updated';

    // Create result document
    const resultPayload: DualTypeAuditResultDocument = {
      auditId,
      auditSessionId,
      date: auditSessionId,
      turma,
      process: processKey,
      status,
      hasIssue,
      rating: options?.rating ?? null,
      comment: hasIssue ? comment?.trim() || null : null,
      imageUrl: hasIssue ? (normalizedProcessImageUrls[0] ?? null) : null,
      imageUrls: hasIssue ? normalizedProcessImageUrls : [],
      printerChecks,
      issueTargets: options?.issueTargets ?? [],
      createdAt: serverTimestamp(),
    };

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
