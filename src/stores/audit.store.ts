import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import {
  completeAudit,
  createAudit,
  getCompletedAuditsByAuditor,
  getTodaysInProgressAuditId,
  updateAuditTurma,
  updateProcess,
} from 'src/services/audit';
import { useAuthStore } from 'stores/auth.store';
import type {
  AuditHistoryItem,
  AuditProcessKey,
  AuditProcessStatus,
  UpdatableProcessStatus,
} from 'src/types/audit';

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
  'frontEnd',
  'lavadora',
  'printer',
  'necker',
  'insideSpray',
  'paletizadora',
];

const AUDIT_DRAFT_STORAGE_KEY = 'audit-form-draft-v1';

interface PersistedAuditDraft {
  date: string;
  auditorId: string;
  auditId: string | null;
  turma: 'A' | 'B' | 'C' | 'D' | null;
  processState: ProcessState;
  completed?: boolean;
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

  function clearPersistedDraft() {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(AUDIT_DRAFT_STORAGE_KEY);
  }

  function readPersistedDraft(auditorId: string): PersistedAuditDraft | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const rawDraft = window.localStorage.getItem(AUDIT_DRAFT_STORAGE_KEY);

    if (!rawDraft) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawDraft) as PersistedAuditDraft;
      const isForToday = parsed.date === getTodayKey();
      const isForAuditor = parsed.auditorId === auditorId;

      if (!isForToday || !isForAuditor) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  function persistDraft() {
    if (typeof window === 'undefined') {
      return;
    }

    const auditorId = authStore.firebaseUser?.uid;

    if (!auditorId || !auditId.value) {
      return;
    }

    const snapshot = PROCESS_KEYS.reduce<ProcessState>((accumulator, key) => {
      accumulator[key] = {
        status: processState[key].status,
        comment: processState[key].comment,
      };
      return accumulator;
    }, {} as ProcessState);

    const payload: PersistedAuditDraft = {
      date: getTodayKey(),
      auditorId,
      auditId: auditId.value,
      turma: turma.value,
      processState: snapshot,
    };

    window.localStorage.setItem(AUDIT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  }

  function applyDraftState(draft: PersistedAuditDraft) {
    turma.value = draft.turma ?? null;

    PROCESS_KEYS.forEach((key) => {
      processState[key] = {
        status: draft.processState[key]?.status ?? null,
        comment: draft.processState[key]?.comment ?? '',
      };
      processFiles[key] = null;
    });
  }

  // ── State ────────────────────────────────────────────────────────────────

  /** ID of the currently active audit document. */
  const auditId = ref<string | null>(null);

  /** Selected work shift responsible for the audit. */
  const turma = ref<'A' | 'B' | 'C' | 'D' | null>(null);

  /** Per-process status and comment, edited directly by the UI. */
  const processState = reactive<ProcessState>(buildInitialProcessState());

  /** Temporary file references for each process — cleared after a successful save. */
  const processFiles = reactive<ProcessFiles>(buildInitialProcessFiles());

  /** True while any async action is in flight. */
  const loading = ref(false);

  /** Holds the last error message produced by a store action. */
  const error = ref<string | null>(null);

  /** Completed audits loaded for the history page. */
  const auditHistory = ref<AuditHistoryItem[]>([]);

  /** True while history data is being requested. */
  const historyLoading = ref(false);

  /** Holds the last history loading error. */
  const historyError = ref<string | null>(null);

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
    const auditorId = authStore.firebaseUser?.uid;
    const currentAuditId = auditId.value;

    if (auditorId && currentAuditId && typeof window !== 'undefined') {
      const marker: PersistedAuditDraft = {
        date: getTodayKey(),
        auditorId,
        auditId: currentAuditId,
        turma: turma.value,
        processState: buildInitialProcessState(),
        completed: true,
      };
      window.localStorage.setItem(AUDIT_DRAFT_STORAGE_KEY, JSON.stringify(marker));
    } else {
      clearPersistedDraft();
    }

    auditId.value = null;
    turma.value = null;
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
  async function startAudit(selectedTurma: 'A' | 'B' | 'C' | 'D'): Promise<void> {
    const auditorId = authStore.firebaseUser?.uid;

    if (!auditorId) {
      throw new Error('Cannot start an audit: no authenticated user.');
    }

    loading.value = true;
    error.value = null;

    try {
      const existingAuditId = await getTodaysInProgressAuditId(auditorId);
      const draft = readPersistedDraft(auditorId);

      if (existingAuditId) {
        auditId.value = existingAuditId;
        turma.value = draft?.turma ?? selectedTurma;

        if (draft && draft.auditId === existingAuditId) {
          applyDraftState(draft);
        }

        persistDraft();
        return;
      }

      turma.value = selectedTurma;
      auditId.value = await createAudit(auditorId, selectedTurma);
      persistDraft();
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

  // Persist local form draft while the user edits the audit.
  watch(auditId, () => {
    persistDraft();
  });

  watch(
    processState,
    () => {
      persistDraft();
    },
    { deep: true },
  );

  /**
   * Reads today's local draft without any network request.
   * Returns the saved progress count and auditId if a draft exists for today,
   * null otherwise. Used by the dashboard to show a "continue" prompt.
   */
  function checkTodaysDraft(): {
    auditId: string;
    turma: 'A' | 'B' | 'C' | 'D' | null;
    completedCount: number;
    completed: boolean;
  } | null {
    const auditorId = authStore.firebaseUser?.uid;

    if (!auditorId) {
      return null;
    }

    const draft = readPersistedDraft(auditorId);

    if (!draft?.auditId) {
      return null;
    }

    if (draft.completed) {
      return {
        auditId: draft.auditId,
        turma: draft.turma ?? null,
        completedCount: PROCESS_KEYS.length,
        completed: true,
      };
    }

    const count = PROCESS_KEYS.filter((key) => draft.processState[key]?.status !== null).length;

    return { auditId: draft.auditId, turma: draft.turma ?? null, completedCount: count, completed: false };
  }

  async function setTurma(value: 'A' | 'B' | 'C' | 'D' | null) {
    turma.value = value;
    persistDraft();

    if (!value || !auditId.value) {
      return;
    }

    try {
      await updateAuditTurma(auditId.value, value);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  /**
   * Loads completed audits for the authenticated auditor.
   */
  async function loadAuditHistory(): Promise<void> {
    const auditorId = authStore.firebaseUser?.uid;

    if (!auditorId) {
      auditHistory.value = [];
      historyError.value = 'Cannot load audit history: no authenticated user.';
      return;
    }

    historyLoading.value = true;
    historyError.value = null;

    try {
      auditHistory.value = await getCompletedAuditsByAuditor(auditorId);
    } catch (err: unknown) {
      historyError.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      historyLoading.value = false;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    // state
    auditId,
    turma,
    processState,
    processFiles,
    loading,
    error,
    auditHistory,
    historyLoading,
    historyError,
    // computed
    completedCount,
    allProcessesCompleted,
    // actions
    startAudit,
    setTurma,
    saveProcess,
    finishAudit,
    checkTodaysDraft,
    loadAuditHistory,
  };
});
