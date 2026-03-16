import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { createAudit, updateProcess, completeAudit } from 'src/services/audit';
import { useAuthStore } from 'stores/auth.store';
import type { AuditProcessKey, AuditProcessStatus, UpdatableProcessStatus } from 'src/types/audit';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ProcessEntry {
  status: AuditProcessStatus;
  comment: string;
}

type ProcessState = Record<AuditProcessKey, ProcessEntry>;
type ProcessFiles = Record<AuditProcessKey, File | null>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROCESS_KEYS: AuditProcessKey[] = [
  'rawMaterials',
  'assembly',
  'packaging',
  'qualityCheck',
  'storage',
  'shipping',
  'safetyInspection',
];

function buildInitialProcessState(): ProcessState {
  return PROCESS_KEYS.reduce<ProcessState>((acc, key) => {
    acc[key] = { status: null, comment: '' };
    return acc;
  }, {} as ProcessState);
}

function buildInitialProcessFiles(): ProcessFiles {
  return PROCESS_KEYS.reduce<ProcessFiles>((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as ProcessFiles);
}

function isProcessReadyForSave(
  processState: ProcessState,
  processFiles: ProcessFiles,
  processKey: AuditProcessKey,
) {
  const { status, comment } = processState[processKey];
  const file = processFiles[processKey];

  if (status === null) {
    return false;
  }

  if (status === 'updated') {
    return true;
  }

  return Boolean(comment.trim()) && Boolean(file);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuditStore = defineStore('audit', () => {
  const authStore = useAuthStore();

  // ── State ────────────────────────────────────────────────────────────────

  /** ID of the currently active audit document. */
  const auditId = ref<string | null>(null);

  /** Per-process status and comment, edited directly by the UI. */
  const processState = reactive<ProcessState>(buildInitialProcessState());

  /** Temporary file references for each process — cleared after a successful save. */
  const processFiles = reactive<ProcessFiles>(buildInitialProcessFiles());

  /** True while any async action is in flight. */
  const loading = ref(false);

  /** Holds the last error message produced by a store action. */
  const error = ref<string | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────

  /** Number of processes that have been given a non-null status. */
  const completedCount = computed<number>(
    () => PROCESS_KEYS.filter((key) => processState[key].status !== null).length,
  );

  /** True when every process has been filled in. */
  const allProcessesCompleted = computed<boolean>(
    () => completedCount.value === PROCESS_KEYS.length,
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetState() {
    auditId.value = null;
    error.value = null;

    PROCESS_KEYS.forEach((key) => {
      processState[key] = { status: null, comment: '' };
      processFiles[key] = null;
    });
  }

  async function persistProcess(processKey: AuditProcessKey) {
    if (!auditId.value) {
      throw new Error('Cannot save a process: no active audit. Call startAudit() first.');
    }

    const { status, comment } = processState[processKey];

    if (!status) {
      throw new Error(`Cannot save process "${processKey}": status has not been set.`);
    }

    const file = processFiles[processKey];

    await updateProcess(
      auditId.value,
      processKey,
      status as UpdatableProcessStatus,
      comment || null,
      file,
    );

    processFiles[processKey] = null;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Creates a new audit document in Firestore and stores the returned ID.
   */
  async function startAudit(): Promise<void> {
    const auditorId = authStore.firebaseUser?.uid;

    if (!auditorId) {
      throw new Error('Cannot start an audit: no authenticated user.');
    }

    loading.value = true;
    error.value = null;

    try {
      auditId.value = await createAudit(auditorId);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Persists the status, comment, and optional image for a single process.
   * Clears the temporary file reference on success.
   *
   * @param processKey Process to save
   */
  async function saveProcess(processKey: AuditProcessKey): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await persistProcess(processKey);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Persists every process, then marks the active audit as completed.
   * Resets local state so the store is ready for a new audit session.
   */
  async function finishAudit(): Promise<void> {
    if (!auditId.value) {
      throw new Error('Cannot finish audit: no active audit.');
    }

    if (!allProcessesCompleted.value) {
      throw new Error(
        `Cannot finish audit: ${PROCESS_KEYS.length - completedCount.value} process(es) still pending.`,
      );
    }

    const invalidProcess = PROCESS_KEYS.find(
      (processKey) => !isProcessReadyForSave(processState, processFiles, processKey),
    );

    if (invalidProcess) {
      throw new Error(
        `Cannot finish audit: ${invalidProcess} requires a complete status, comment, and photo before submission.`,
      );
    }

    loading.value = true;
    error.value = null;

    try {
      for (const processKey of PROCESS_KEYS) {
        await persistProcess(processKey);
      }

      await completeAudit(auditId.value);
      resetState();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    // state
    auditId,
    processState,
    processFiles,
    loading,
    error,
    // computed
    completedCount,
    allProcessesCompleted,
    // actions
    startAudit,
    saveProcess,
    finishAudit,
  };
});
