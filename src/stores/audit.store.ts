import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
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

export const useAuditStore = defineStore(
  'audit',
  () => {
    const authStore = useAuthStore();

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

    // ── Draft metadata (persisted alongside audit state) ──────────────────

    /** Date key (YYYY-MM-DD) when the active draft was created. Used to detect stale drafts on startup. */
    const draftDate = ref<string | null>(null);

    /** Auditor UID who owns the persisted draft. Prevents one user from resuming another's session. */
    const draftAuditorId = ref<string | null>(null);

    /** True once the day's audit has been submitted. */
    const draftCompleted = ref(false);

    /**
     * Audit ID captured at completion time.
     * Kept after `auditId` is nulled so the dashboard can still reference
     * the finished document.
     */
    const draftCompletedAuditId = ref<string | null>(null);

    /** Turma captured at completion time (mirrors the same need as `draftCompletedAuditId`). */
    const draftCompletedTurma = ref<'A' | 'B' | 'C' | 'D' | null>(null);

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
      // Capture current values before nulling them so the dashboard can still
      // reference the just-completed audit via checkTodaysDraft().
      draftCompletedAuditId.value = auditId.value;
      draftCompletedTurma.value = turma.value;
      draftCompleted.value = true;

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
     * On reload, re-attaches to today's in-progress audit and restores
     * persisted process state when the draft belongs to the same audit.
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

        // The persisted draft is valid when it belongs to today, this auditor,
        // and has not been marked completed.
        const hasDraft =
          Boolean(auditId.value) &&
          draftAuditorId.value === auditorId &&
          draftDate.value === getTodayKey() &&
          !draftCompleted.value;

        if (existingAuditId) {
          const draftMatchesExisting = hasDraft && auditId.value === existingAuditId;

          if (!draftMatchesExisting) {
            // Firestore has a different or newer audit — discard the stale local state.
            PROCESS_KEYS.forEach((key) => {
              processState[key] = { status: null, comment: '' };
            });
          }

          auditId.value = existingAuditId;
          turma.value = draftMatchesExisting ? (turma.value ?? selectedTurma) : selectedTurma;
          draftDate.value = getTodayKey();
          draftAuditorId.value = auditorId;
          draftCompleted.value = false;
          return;
        }

        // No in-progress audit for today — start fresh.
        PROCESS_KEYS.forEach((key) => {
          processState[key] = { status: null, comment: '' };
        });
        turma.value = selectedTurma;
        auditId.value = await createAudit(auditorId, selectedTurma);
        draftDate.value = getTodayKey();
        draftAuditorId.value = auditorId;
        draftCompleted.value = false;
        draftCompletedAuditId.value = null;
        draftCompletedTurma.value = null;
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

    /**
     * Reads today's draft state without any network request.
     * Used by the dashboard to show a "continue" prompt or completion indicator.
     */
    function checkTodaysDraft(): {
      auditId: string;
      turma: 'A' | 'B' | 'C' | 'D' | null;
      completedCount: number;
      completed: boolean;
    } | null {
      const auditorId = authStore.firebaseUser?.uid;

      if (!auditorId || draftAuditorId.value !== auditorId || draftDate.value !== getTodayKey()) {
        return null;
      }

      if (draftCompleted.value) {
        if (!draftCompletedAuditId.value) return null;

        return {
          auditId: draftCompletedAuditId.value,
          turma: draftCompletedTurma.value,
          completedCount: PROCESS_KEYS.length,
          completed: true,
        };
      }

      if (!auditId.value) return null;

      const count = PROCESS_KEYS.filter((key) => processState[key]?.status !== null).length;

      return { auditId: auditId.value, turma: turma.value, completedCount: count, completed: false };
    }

    async function setTurma(value: 'A' | 'B' | 'C' | 'D' | null) {
      turma.value = value;

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
  },
  {
    persist: {
      key: 'audit-form-draft-v2',
      pick: [
        'auditId',
        'turma',
        'processState',
        'draftDate',
        'draftAuditorId',
        'draftCompleted',
        'draftCompletedAuditId',
        'draftCompletedTurma',
      ],
    },
  },
);
