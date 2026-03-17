import { db, storage } from 'boot/firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { createAuditResults } from './auditResults';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type {
  AuditDocument,
  AuditHistoryItem,
  AuditProcess,
  AuditProcessKey,
  AuditProcesses,
  NewAuditDocument,
  UpdatableProcessStatus,
} from 'src/types/audit';

const PROCESS_KEYS: AuditProcessKey[] = [
  'frontEnd',
  'lavadora',
  'printer',
  'necker',
  'insideSpray',
  'paletizadora',
];

const TOTAL_PROCESSES = PROCESS_KEYS.length;

function getLocalDayRange() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return {
    startMs: dayStart.getTime(),
    endMs: dayEnd.getTime(),
  };
}

function getAuditCalendarMetadata(referenceDate = new Date()) {
  const dayOfWeek = referenceDate.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
  const yearMonth = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  return { dayOfWeek, yearMonth };
}

function parseTurma(value: unknown): 'A' | 'B' | 'C' | 'D' | null {
  if (value === 'A' || value === 'B' || value === 'C' || value === 'D') {
    return value;
  }

  return null;
}

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

function normalizeProcesses(
  rawProcesses: Partial<Record<AuditProcessKey, Partial<AuditProcess>>> | undefined,
): AuditProcesses {
  const fallback = buildInitialProcesses();

  return PROCESS_KEYS.reduce<AuditProcesses>((accumulator, key) => {
    const source = rawProcesses?.[key];

    accumulator[key] = {
      status: source?.status ?? fallback[key].status,
      comment: source?.comment ?? null,
      imageUrl: source?.imageUrl ?? null,
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
export async function createAudit(
  auditorId: string,
  turma: 'A' | 'B' | 'C' | 'D',
): Promise<string> {
  const { dayOfWeek, yearMonth } = getAuditCalendarMetadata();

  const payload: NewAuditDocument = {
    auditorId,
    turma,
    dayOfWeek,
    yearMonth,
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
 * Finds the latest in-progress audit for the current local day and auditor.
 *
 * This is used to avoid creating duplicate audit documents when users
 * leave and return to the form during the same day.
 *
 * @param auditorId Authenticated auditor identifier
 * @returns Existing audit ID for today, or null when none exists
 */
export async function getTodaysInProgressAuditId(auditorId: string): Promise<string | null> {
  const auditsQuery = query(
    collection(db, 'audits'),
    where('auditorId', '==', auditorId),
    where('status', '==', 'in_progress'),
  );

  const snapshots = await getDocs(auditsQuery);
  const { startMs, endMs } = getLocalDayRange();

  let latestAuditId: string | null = null;
  let latestCreatedAt = 0;

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<AuditDocument>;
    if (!(data.createdAt instanceof Timestamp)) {
      return;
    }

    const createdAtMs = data.createdAt.toMillis();

    if (createdAtMs < startMs || createdAtMs >= endMs) {
      return;
    }

    if (createdAtMs >= latestCreatedAt) {
      latestCreatedAt = createdAtMs;
      latestAuditId = snapshot.id;
    }
  });

  return latestAuditId;
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
 * Updates the responsible turma for an existing audit.
 *
 * @param auditId Audit document ID
 * @param turma New responsible turma
 */
export async function updateAuditTurma(
  auditId: string,
  turma: 'A' | 'B' | 'C' | 'D',
): Promise<void> {
  const auditRef = doc(db, 'audits', auditId);
  await updateDoc(auditRef, { turma });
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

/**
 * Loads all completed audits for an auditor, sorted by most recent first.
 *
 * @param auditorId Authenticated auditor identifier
 * @returns Completed audit summaries for the history page
 */
export async function getCompletedAuditsByAuditor(auditorId: string): Promise<AuditHistoryItem[]> {
  const auditsQuery = query(
    collection(db, 'audits'),
    where('auditorId', '==', auditorId),
    where('status', '==', 'completed'),
  );

  const snapshots = await getDocs(auditsQuery);

  const history = snapshots.docs.map((snapshot) => {
    const data = snapshot.data() as Partial<AuditDocument>;

    return {
      id: snapshot.id,
      status: 'completed',
      turma: parseTurma(data.turma),
      dayOfWeek: data.dayOfWeek ?? '',
      yearMonth: data.yearMonth ?? '',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
      failedProcesses: data.failedProcesses ?? 0,
      totalProcesses: data.totalProcesses ?? TOTAL_PROCESSES,
      hasFailures: data.hasFailures ?? (data.failedProcesses ?? 0) > 0,
      processes: normalizeProcesses(data.processes),
    } satisfies AuditHistoryItem;
  });

  history.sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return history;
}
