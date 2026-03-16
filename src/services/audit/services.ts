import { db, storage } from 'boot/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { createAuditResults } from './auditResults';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type {
  AuditDocument,
  AuditProcess,
  AuditProcessKey,
  AuditProcesses,
  NewAuditDocument,
  UpdatableProcessStatus,
} from 'src/types/audit';

const PROCESS_KEYS: AuditProcessKey[] = [
  'rawMaterials',
  'assembly',
  'packaging',
  'qualityCheck',
  'storage',
  'shipping',
  'safetyInspection',
];

const TOTAL_PROCESSES = PROCESS_KEYS.length;

function buildInitialProcesses(): AuditProcesses {
  return PROCESS_KEYS.reduce<AuditProcesses>((accumulator, key) => {
    accumulator[key] = {
      status: null,
      comment: null,
      imageUrl: null,
    };

    return accumulator;
  }, {} as AuditProcesses);
}

function assertProcessKey(processKey: string): asserts processKey is AuditProcessKey {
  if (!PROCESS_KEYS.includes(processKey as AuditProcessKey)) {
    throw new Error(`Invalid process key: ${processKey}`);
  }
}

/**
 * Creates a new audit document with all processes initialized to pending (`status: null`).
 *
 * @param auditorId Authenticated auditor identifier creating the audit
 * @returns The generated Firestore audit document ID
 */
export async function createAudit(auditorId: string): Promise<string> {
  const payload: NewAuditDocument = {
    auditorId,
    createdAt: serverTimestamp(),
    status: 'in_progress',
    processes: buildInitialProcesses(),
    failedProcesses: 0,
    totalProcesses: TOTAL_PROCESSES,
  };

  const snapshot = await addDoc(collection(db, 'audits'), payload);
  return snapshot.id;
}

/**
 * Uploads a process image to Firebase Storage and returns its public download URL.
 *
 * Path format: `audits/{auditId}/{processKey}/{timestamp}.jpg`
 *
 * @param auditId Audit document ID
 * @param processKey Process key where the image belongs
 * @param file Image file selected by the auditor
 * @returns Storage download URL
 */
export async function uploadAuditImage(
  auditId: string,
  processKey: AuditProcessKey,
  file: File,
): Promise<string> {
  const fileName = `${Date.now()}.jpg`;
  const storagePath = `audits/${auditId}/${processKey}/${fileName}`;
  const imageRef = ref(storage, storagePath);

  await uploadBytes(imageRef, file);
  return getDownloadURL(imageRef);
}

/**
 * Updates one process inside an existing audit document.
 *
 * If the process is marked as `not_updated`, both `comment` and `imageFile` are required.
 * The image is uploaded to Firebase Storage and its URL is saved in the process entry.
 *
 * @param auditId Audit document ID
 * @param processKey Process key to update
 * @param status New process status (`updated` or `not_updated`)
 * @param comment Optional process note; required when status is `not_updated`
 * @param imageFile Optional process image; required when status is `not_updated`
 */
export async function updateProcess(
  auditId: string,
  processKey: AuditProcessKey,
  status: UpdatableProcessStatus,
  comment: string | null = null,
  imageFile: File | null = null,
): Promise<void> {
  assertProcessKey(processKey);

  const trimmedComment = comment?.trim() ?? null;

  if (status === 'not_updated') {
    if (!trimmedComment) {
      throw new Error('Comment is required when process status is "not_updated".');
    }

    if (!imageFile) {
      throw new Error('Image is required when process status is "not_updated".');
    }
  }

  let imageUrl: string | null = null;

  if (status === 'not_updated' && imageFile) {
    imageUrl = await uploadAuditImage(auditId, processKey, imageFile);
  }

  const processData: AuditProcess = {
    status,
    comment: status === 'not_updated' ? trimmedComment : null,
    imageUrl: status === 'not_updated' ? imageUrl : null,
  };

  const auditRef = doc(db, 'audits', auditId);
  await updateDoc(auditRef, {
    [`processes.${processKey}`]: processData,
  });
}

/**
 * Marks an audit as completed and recalculates failed processes.
 *
 * A failed process is any process with status `not_updated`.
 *
 * @param auditId Audit document ID
 */
export async function completeAudit(auditId: string): Promise<void> {
  const auditRef = doc(db, 'audits', auditId);
  const snapshot = await getDoc(auditRef);

  if (!snapshot.exists()) {
    throw new Error(`Audit ${auditId} does not exist.`);
  }

  const audit = snapshot.data() as AuditDocument;

  const failedProcesses = Object.values(audit.processes).filter(
    (process) => process.status === 'not_updated',
  ).length;

  await updateDoc(auditRef, {
    status: 'completed',
    failedProcesses,
    hasFailures: failedProcesses > 0,
  });

  // Write one flat analytics document per process to the `auditResults` collection.
  // These denormalized records make it cheap to query failures by process or time.
  await createAuditResults(auditId, audit);
}
