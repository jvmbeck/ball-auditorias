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
  Daily5sIssueReason,
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
  grade1Reason?: Daily5sIssueReason | null;
  grade1Comment?: string | null;
}

function normalizeImageUrls(imageUrls: unknown): string[] {
  const normalized = new Set<string>();

  if (Array.isArray(imageUrls)) {
    imageUrls.forEach((value) => {
      if (typeof value === 'string' && value.length > 0) {
        normalized.add(value);
      }
    });
  }

  return [...normalized];
}

async function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');

    if (typeof canvas.toBlob !== 'function') {
      resolve(false);
      return;
    }

    canvas.width = 1;
    canvas.height = 1;
    canvas.toBlob(
      (blob) => {
        resolve(blob?.type === 'image/webp');
      },
      'image/webp',
      0.8,
    );
  });
}

async function resizeAndConvertImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;

        if (!sourceWidth || !sourceHeight) {
          reject(new Error('Invalid image size.'));
          return;
        }

        const maxDimension = 1920;
        const longestSide = Math.max(sourceWidth, sourceHeight);
        const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;

        const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
        const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Failed to create canvas context.'));
          return;
        }

        context.drawImage(image, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image to WebP.'));
              return;
            }

            resolve(blob);
          },
          'image/webp',
          0.8,
        );
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for processing.'));
    };

    image.src = objectUrl;
  });
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
   * Uses the provided audit ID as the document ID.
   *
   * @param auditId Unique audit document identifier
   * @param date Date string in YYYY-MM-DD format
   * @param inspector User ID of the inspector
   * @returns Document ID
   */
  async function createAudit(
    auditId: string,
    date: string,
    turma: 'A e C' | 'B e D',
    inspector: string,
  ): Promise<string> {
    const payload: Omit<DualTypeAuditDocument, 'createdAt'> & { createdAt: FieldValue } = {
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
   * @param auditDate Canonical audit day in YYYY-MM-DD format
   * @param processKey Process to update
   * @param status Process status
   * @param comment Optional comment
   * @param imageFiles Optional image files
   */
  async function updateProcess(
    auditId: string,
    auditDate: string,
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

    let processImageUrls = normalizeImageUrls(existingResult?.imageUrls);
    let printerChecks = options?.printerChecks ?? null;
    const webpSupported = await supportsWebP();

    // Upload process images, preserving previous ones.
    if (status === 'not_updated' && imageFiles?.length) {
      const uploadedImageUrls: string[] = [];

      for (const file of imageFiles) {
        try {
          const processed = webpSupported ? await resizeAndConvertImage(file) : file;
          const uploadFile =
            processed instanceof File
              ? processed
              : new File([processed], `${file.name.replace(/\.[^/.]+$/, '')}.webp`, {
                  type: 'image/webp',
                });

          uploadedImageUrls.push(await uploadImage(auditId, processKey, uploadFile));
        } catch (error) {
          console.error('Image processing failed, uploading original file', error);
          uploadedImageUrls.push(await uploadImage(auditId, processKey, file));
        }
      }

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

      const uploadedPrinterChecks: Array<[PrinterCheckKey, PrinterChecks[PrinterCheckKey]]> = [];

      for (const [printerKey, printerCheck] of printerEntries) {
        const printerFiles = options.printerFiles?.[printerKey] ?? null;

        const existingImageUrls = normalizeImageUrls(
          existingPrinterChecks?.[printerKey]?.imageUrls,
        );

        if (printerCheck.status === 'not_updated') {
          const uploadedImageUrls: string[] = [];

          if (printerFiles?.length) {
            for (const printerFile of printerFiles) {
              try {
                const processed = webpSupported
                  ? await resizeAndConvertImage(printerFile)
                  : printerFile;
                const uploadFile =
                  processed instanceof File
                    ? processed
                    : new File([processed], `${printerFile.name.replace(/\.[^/.]+$/, '')}.webp`, {
                        type: 'image/webp',
                      });

                uploadedImageUrls.push(
                  await uploadImage(auditId, processKey, uploadFile, printerKey),
                );
              } catch (error) {
                console.error('Image processing failed, uploading original file', error);
                uploadedImageUrls.push(
                  await uploadImage(auditId, processKey, printerFile, printerKey),
                );
              }
            }
          }

          uploadedPrinterChecks.push([
            printerKey,
            {
              ...printerCheck,
              imageUrls: [...existingImageUrls, ...uploadedImageUrls],
            },
          ]);
        } else {
          uploadedPrinterChecks.push([
            printerKey,
            {
              ...printerCheck,
              imageUrls: [],
            },
          ]);
        }
      }

      printerChecks = Object.fromEntries(uploadedPrinterChecks) as PrinterChecks;
    }

    if (printerChecks && !options?.printerFiles) {
      const printerEntries = Object.entries(printerChecks) as Array<
        [PrinterCheckKey, PrinterChecks[PrinterCheckKey]]
      >;
      const normalizedPrinterChecks = Object.fromEntries(
        printerEntries.map(([printerKey, printerCheck]) => {
          const normalizedUrls = normalizeImageUrls(printerCheck.imageUrls);

          return [
            printerKey,
            {
              ...printerCheck,
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
          const normalizedUrls = normalizeImageUrls(printerCheck.imageUrls);

          return [
            printerKey,
            {
              ...printerCheck,
              imageUrls: normalizedUrls,
            },
          ];
        }),
      ) as PrinterChecks;

      printerChecks = normalizedPrinterChecks;
    }

    const normalizedProcessImageUrls = normalizeImageUrls(processImageUrls);

    const hasIssue = status === 'not_updated';
    const normalizedComment = hasIssue ? comment?.trim() || null : null;
    const normalizedGrade1Reason = hasIssue ? (options?.grade1Reason ?? null) : null;
    const normalizedGrade1Comment = hasIssue ? options?.grade1Comment?.trim() || null : null;

    const resultPayloadBase: DualTypeAuditResultDocument = {
      auditId,
      date: auditDate,
      turma,
      process: processKey,
      status,
      rating: options?.rating ?? null,
      imageUrls: hasIssue ? normalizedProcessImageUrls : [],
      createdAt: serverTimestamp(),
    };

    const resultPayload: DualTypeAuditResultDocument =
      config.resultsCollection === 'daily5sProcessResults'
        ? {
            ...resultPayloadBase,
            grade1Reason: normalizedGrade1Reason,
            grade1Comment: normalizedGrade1Comment,
          }
        : {
            ...resultPayloadBase,
            comment: normalizedComment,
            printerChecks,
            issueTargets: options?.issueTargets ?? [],
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
