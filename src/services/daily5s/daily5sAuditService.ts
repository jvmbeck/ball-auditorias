import { db, storage } from 'boot/firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type {
  Daily5sAuditProcessKey,
  Daily5sIssueReason,
  Daily5sRatingValue,
  AuditTurma,
} from 'src/types/audit';
import type {
  Daily5sAuditDocument,
  Daily5sProcessResultDocument,
} from 'src/types/daily5sDocuments';

const AUDIT_COLLECTION = 'daily5sAudits';
const RESULTS_COLLECTION = 'daily5sProcessResults';

interface Daily5sProcessData {
  rating?: Daily5sRatingValue;
  grade1Reason?: Daily5sIssueReason[] | null;
  grade1Comment?: string | null;
  inspectorId?: string;
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

function normalizeGrade1Reasons(reasons: unknown): Daily5sIssueReason[] {
  if (!Array.isArray(reasons)) {
    return [];
  }

  const normalized = new Set<Daily5sIssueReason>();

  reasons.forEach((reason) => {
    if (
      reason === 'Latas acumuladas' ||
      reason === 'Sujeira no Piso' ||
      reason === 'Sujeira nas Máquinas' ||
      reason === 'Desorganização'
    ) {
      normalized.add(reason);
    }
  });

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

// Creates a unique file name for the uploaded image, preserving the original name.
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
 * Path format: `audits/{auditType}/{auditDate}/{processKey}/{timestamp}_{uuid}_{filename}`
 */
async function uploadImage(
  auditDate: string,
  processKey: Daily5sAuditProcessKey,
  file: File,
  evaluationType?: string,
): Promise<string> {
  const fileName = createUniqueFileName(file);
  const evaluationPath = evaluationType ? `/${evaluationType}` : '';
  const storagePath = `audits/${AUDIT_COLLECTION}/${auditDate}/${processKey}${evaluationPath}/${fileName}`;
  const imageRef = ref(storage, storagePath);

  await uploadBytes(imageRef, file);
  return getDownloadURL(imageRef);
}

/**
 * Creates a new audit document.
 *
 * Uses the provided audit ID as the document ID.
 *
 * @param date Date string in YYYY-MM-DD format
 * @param inspector User ID of the inspector
 * @returns Document ID
 */
export async function ensureAudit(
  date: string,
  turma: 'A e C' | 'B e D',
  inspector: string,
): Promise<string> {
  const auditRef = doc(db, AUDIT_COLLECTION, date);
  const snapshot = await getDoc(auditRef);

  if (!snapshot.exists()) {
    const daily5sPayload = {
      date,
      turma,
      inspector,
      aggregateGrades: {},
      completedProcesses: 0,
      createdAt: serverTimestamp(),
    };

    await setDoc(auditRef, daily5sPayload);
  }

  return date;
}

/**
 * Updates the result for a Daily 5S process.
 *
 * If the rating is 1, images and issue information may be attached.
 * Creates the audit document automatically if it does not exist.
 *
 * @param auditDate Canonical audit day in YYYY-MM-DD format
 * @param processKey Process to update
 * @param imageFiles Optional image files
 */
export async function updateProcess(
  auditDate: string,
  turma: AuditTurma,
  processKey: Daily5sAuditProcessKey,
  imageFiles: File[] | null = null,
  options?: Daily5sProcessData,
): Promise<void> {
  const auditRef = doc(db, AUDIT_COLLECTION, auditDate);
  const snapshot = await getDoc(auditRef);

  if (!snapshot.exists()) {
    if (!options?.inspectorId) {
      throw new Error('Cannot create Daily 5S audit without inspector ID.');
    }

    const daily5sPayload = {
      date: auditDate,
      turma,
      inspector: options.inspectorId,
      aggregateGrades: {},
      completedProcesses: 0,
      createdAt: serverTimestamp(),
    };

    await setDoc(auditRef, daily5sPayload, { merge: true });
  }

  const resultId = `${auditDate}_${processKey}`;
  const resultRef = doc(db, RESULTS_COLLECTION, resultId);
  const existingResultSnapshot = await getDoc(resultRef);
  const existingResult = existingResultSnapshot.exists()
    ? (existingResultSnapshot.data() as Partial<Daily5sProcessResultDocument>)
    : null;

  const rating = options?.rating;
  const hasIssue = rating === 1;
  if (rating == null) {
    throw new Error('Rating is required.');
  }

  let processImageUrls = normalizeImageUrls(existingResult?.imageUrls);
  const webpSupported = await supportsWebP();

  // Upload process images, preserving previous ones.
  if (hasIssue && imageFiles?.length) {
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

        uploadedImageUrls.push(await uploadImage(auditDate, processKey, uploadFile));
      } catch (error) {
        console.error('Image processing failed, uploading original file', error);
        uploadedImageUrls.push(await uploadImage(auditDate, processKey, file));
      }
    }

    processImageUrls = [...processImageUrls, ...uploadedImageUrls];
  }

  if (!hasIssue) {
    processImageUrls = [];
  }

  const normalizedProcessImageUrls = normalizeImageUrls(processImageUrls);

  const normalizedGrade1Reason = hasIssue ? normalizeGrade1Reasons(options?.grade1Reason) : [];
  const normalizedGrade1Comment = hasIssue ? options?.grade1Comment?.trim() || null : null;

  const resultPayload: Daily5sProcessResultDocument = {
    date: auditDate,
    turma,
    process: processKey,
    rating,
    imageUrls: hasIssue ? normalizedProcessImageUrls : [],
    grade1Reason: normalizedGrade1Reason,
    grade1Comment: normalizedGrade1Comment,
    createdAt: serverTimestamp(),
  };

  await setDoc(resultRef, resultPayload, { merge: true });

  const auditSnapshot = await getDoc(auditRef);
  const existing = auditSnapshot.exists()
    ? (auditSnapshot.data() as Partial<Daily5sAuditDocument>)
    : null;

  const aggregateGrades = {
    ...(existing?.aggregateGrades ?? {}),
    [processKey]: rating,
  } as Partial<Record<Daily5sAuditProcessKey, Daily5sRatingValue>>;

  await setDoc(
    auditRef,
    {
      date: auditDate,
      turma,
      aggregateGrades,
      completedProcesses: Object.keys(aggregateGrades).length,
    },
    { merge: true },
  );
}
