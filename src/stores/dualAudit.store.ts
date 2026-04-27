import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { useAuthStore } from './auth.store';
import { checklistAuditService, boardAuditService } from 'src/services/audit';
import type {
  AuditProcessStatus,
  AuditType,
  Board5sAuditProcessKey,
  DualAuditProcessKey,
  PrinterCheckKey,
  PrinterChecks,
  RtoAuditProcessKey,
  UpdatableProcessStatus,
} from 'src/types/audit';

// ─── Internal types ──────────────────────────────────────────────────────

interface ProcessEntry {
  status: AuditProcessStatus;
  comment: string;
}

type GenericProcessState<TKey extends string> = Record<TKey, ProcessEntry>;
type GenericProcessFiles<TKey extends string> = Record<TKey, File | null>;

type RtoProcessState = GenericProcessState<RtoAuditProcessKey>;
type Board5sProcessState = GenericProcessState<Board5sAuditProcessKey>;
type RtoProcessFiles = GenericProcessFiles<RtoAuditProcessKey>;
type Board5sProcessFiles = GenericProcessFiles<Board5sAuditProcessKey>;

type PrinterProcessState = Record<PrinterCheckKey, ProcessEntry>;
type PrinterProcessFiles = Record<PrinterCheckKey, File | null>;

// ─── Constants ───────────────────────────────────────────────────────────

const RTO_PROCESS_KEYS: RtoAuditProcessKey[] = [
  'frontEnd',
  'lavadora',
  'printer',
  'necker',
  'insideSpray',
  'paletizadora',
];

const BOARD5S_PROCESS_KEYS: Board5sAuditProcessKey[] = [
  'minsters',
  'bodyMakers11to14',
  'bodyMakers15to18',
  'bodyMakers19to23',
  'bodyMakers24to31',
  'printer1',
  'printer2e3',
];

const PRINTER_CHECK_KEYS: PrinterCheckKey[] = ['printer1', 'printer2', 'printer3'];

// ─── Helpers ─────────────────────────────────────────────────────────────

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildInitialProcessState<TKey extends string>(
  processKeys: TKey[],
): GenericProcessState<TKey> {
  return processKeys.reduce<GenericProcessState<TKey>>((acc, key) => {
    acc[key] = { status: null, comment: '' };
    return acc;
  }, {} as GenericProcessState<TKey>);
}

function buildInitialProcessFiles<TKey extends string>(
  processKeys: TKey[],
): GenericProcessFiles<TKey> {
  return processKeys.reduce<GenericProcessFiles<TKey>>((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as GenericProcessFiles<TKey>);
}

function buildInitialPrinterProcessState(): PrinterProcessState {
  return PRINTER_CHECK_KEYS.reduce<PrinterProcessState>((acc, key) => {
    acc[key] = { status: null, comment: '' };
    return acc;
  }, {} as PrinterProcessState);
}

function buildInitialPrinterProcessFiles(): PrinterProcessFiles {
  return PRINTER_CHECK_KEYS.reduce<PrinterProcessFiles>((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as PrinterProcessFiles);
}

function isProcessReadyForSave<TKey extends string>(
  processState: GenericProcessState<TKey>,
  processFiles: GenericProcessFiles<TKey>,
  processKey: TKey,
): boolean {
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

function isPrinterReadyForSave(
  printerState: PrinterProcessState,
  printerFiles: PrinterProcessFiles,
): boolean {
  return PRINTER_CHECK_KEYS.every((printerKey) => {
    const { status, comment } = printerState[printerKey];
    const file = printerFiles[printerKey];

    if (status === null) {
      return false;
    }

    if (status === 'updated') {
      return true;
    }

    return Boolean(comment.trim()) && Boolean(file);
  });
}

function getPrinterAggregateStatus(printerState: PrinterProcessState): AuditProcessStatus {
  const statuses = PRINTER_CHECK_KEYS.map((printerKey) => printerState[printerKey].status);

  if (statuses.some((status) => status === null)) {
    return null;
  }

  return statuses.some((status) => status === 'not_updated') ? 'not_updated' : 'updated';
}

function buildPrinterChecksPayload(printerState: PrinterProcessState): PrinterChecks {
  return PRINTER_CHECK_KEYS.reduce<PrinterChecks>((acc, printerKey) => {
    const { status, comment } = printerState[printerKey];

    acc[printerKey] = {
      status,
      comment: status === 'not_updated' ? comment.trim() || null : null,
      imageUrl: null,
    };

    return acc;
  }, {} as PrinterChecks);
}

function buildPrinterIssueTargets(printerState: PrinterProcessState): PrinterCheckKey[] {
  return PRINTER_CHECK_KEYS.filter(
    (printerKey) => printerState[printerKey].status === 'not_updated',
  );
}

function buildPrinterSummaryComment(printerState: PrinterProcessState): string | null {
  const issueSummaries = PRINTER_CHECK_KEYS.flatMap((printerKey) => {
    if (printerState[printerKey].status !== 'not_updated') {
      return [];
    }

    const label = printerKey.replace('printer', 'Printer ');
    const comment = printerState[printerKey].comment.trim();

    return [comment ? `${label}: ${comment}` : label];
  });

  if (!issueSummaries.length) {
    return null;
  }

  return issueSummaries.join('; ');
}

// ─── Store ───────────────────────────────────────────────────────────────

export const useDualAuditStore = defineStore(
  'dualAudit',
  () => {
    const authStore = useAuthStore();

    // ── State (per audit type) ────────────────────────────────────────────

    // Checklist audit
    const checklistAuditId = ref<string | null>(null);
    const checklistProcessState = reactive<RtoProcessState>(
      buildInitialProcessState(RTO_PROCESS_KEYS),
    );
    const checklistProcessFiles = reactive<RtoProcessFiles>(
      buildInitialProcessFiles(RTO_PROCESS_KEYS),
    );
    const checklistPrinterState = reactive<PrinterProcessState>(buildInitialPrinterProcessState());
    const checklistPrinterFiles = reactive<PrinterProcessFiles>(buildInitialPrinterProcessFiles());

    // Board audit
    const boardAuditId = ref<string | null>(null);
    const boardProcessState = reactive<Board5sProcessState>(
      buildInitialProcessState(BOARD5S_PROCESS_KEYS),
    );
    const boardProcessFiles = reactive<Board5sProcessFiles>(
      buildInitialProcessFiles(BOARD5S_PROCESS_KEYS),
    );

    // Common state
    const loading = ref(false);
    const error = ref<string | null>(null);
    const turma = ref<'A e C' | 'B e D' | null>(null);

    // ── Draft metadata ────────────────────────────────────────────────────

    const draftDate = ref<string | null>(null);
    const draftAuditorId = ref<string | null>(null);
    const draftCompleted = ref(false);
    const draftCompletedChecklistId = ref<string | null>(null);
    const draftCompletedBoardId = ref<string | null>(null);

    // ── Computed (per type) ───────────────────────────────────────────────

    const checklistCompletedCount = computed<number>(
      () =>
        RTO_PROCESS_KEYS.filter((key) => {
          if (key === 'printer') {
            return PRINTER_CHECK_KEYS.every(
              (printerKey) => checklistPrinterState[printerKey].status !== null,
            );
          }

          return checklistProcessState[key].status !== null;
        }).length,
    );

    const boardCompletedCount = computed<number>(
      () => BOARD5S_PROCESS_KEYS.filter((key) => boardProcessState[key].status !== null).length,
    );

    const checklistComplete = computed<boolean>(
      () => checklistCompletedCount.value === RTO_PROCESS_KEYS.length,
    );

    const boardComplete = computed<boolean>(
      () => boardCompletedCount.value === BOARD5S_PROCESS_KEYS.length,
    );

    const allComplete = computed<boolean>(() => checklistComplete.value && boardComplete.value);

    // ── Helper functions ─────────────────────────────────────────────────

    function resetState() {
      draftCompletedChecklistId.value = checklistAuditId.value;
      draftCompletedBoardId.value = boardAuditId.value;
      draftCompleted.value = true;

      checklistAuditId.value = null;
      boardAuditId.value = null;
      error.value = null;
      turma.value = null;

      // Reset all process state
      RTO_PROCESS_KEYS.forEach((key) => {
        checklistProcessState[key] = { status: null, comment: '' };
        checklistProcessFiles[key] = null;
      });

      PRINTER_CHECK_KEYS.forEach((printerKey) => {
        checklistPrinterState[printerKey] = { status: null, comment: '' };
        checklistPrinterFiles[printerKey] = null;
      });

      BOARD5S_PROCESS_KEYS.forEach((key) => {
        boardProcessState[key] = { status: null, comment: '' };
        boardProcessFiles[key] = null;
      });
    }

    async function persistProcess(type: AuditType, processKey: DualAuditProcessKey): Promise<void> {
      const isRtoAudit = type === 'rto';
      const validRtoKey = isRtoAudit && RTO_PROCESS_KEYS.includes(processKey as RtoAuditProcessKey);
      const validBoardKey =
        !isRtoAudit && BOARD5S_PROCESS_KEYS.includes(processKey as Board5sAuditProcessKey);

      if (!validRtoKey && !validBoardKey) {
        throw new Error(`Process "${processKey}" does not belong to ${type} audit.`);
      }

      const sessionId = getTodayKey(); // Use date as session ID

      if (!turma.value) {
        throw new Error('Cannot save process: turma not selected.');
      }

      if (isRtoAudit) {
        const rtoProcessKey = processKey as RtoAuditProcessKey;
        const auditId = checklistAuditId.value;

        if (!auditId) {
          throw new Error('Cannot save process: no active rto audit.');
        }

        if (rtoProcessKey === 'printer') {
          if (!isPrinterReadyForSave(checklistPrinterState, checklistPrinterFiles)) {
            throw new Error('Cannot save process "printer": complete Printer 1, 2, and 3 first.');
          }

          const printerStatus = getPrinterAggregateStatus(checklistPrinterState);

          if (!printerStatus) {
            throw new Error('Cannot save process "printer": status not set.');
          }

          await checklistAuditService.updateProcess(
            auditId,
            sessionId,
            turma.value,
            rtoProcessKey,
            printerStatus as UpdatableProcessStatus,
            buildPrinterSummaryComment(checklistPrinterState),
            null,
            {
              issueTargets: buildPrinterIssueTargets(checklistPrinterState),
              printerChecks: buildPrinterChecksPayload(checklistPrinterState),
              printerFiles: checklistPrinterFiles,
            },
          );

          PRINTER_CHECK_KEYS.forEach((printerKey) => {
            checklistPrinterFiles[printerKey] = null;
          });

          return;
        }

        const { status, comment } = checklistProcessState[rtoProcessKey];
        if (!status) {
          throw new Error(`Cannot save process "${rtoProcessKey}": status not set.`);
        }

        const file = checklistProcessFiles[rtoProcessKey];

        await checklistAuditService.updateProcess(
          auditId,
          sessionId,
          turma.value,
          rtoProcessKey,
          status as UpdatableProcessStatus,
          comment || null,
          file,
        );

        checklistProcessFiles[rtoProcessKey] = null;
        return;
      }

      const boardProcessKey = processKey as Board5sAuditProcessKey;
      const auditId = boardAuditId.value;

      if (!auditId) {
        throw new Error('Cannot save process: no active board5s audit.');
      }

      const { status, comment } = boardProcessState[boardProcessKey];
      if (!status) {
        throw new Error(`Cannot save process "${boardProcessKey}": status not set.`);
      }

      const file = boardProcessFiles[boardProcessKey];

      await boardAuditService.updateProcess(
        auditId,
        sessionId,
        turma.value,
        boardProcessKey,
        status as UpdatableProcessStatus,
        comment || null,
        file,
      );

      boardProcessFiles[boardProcessKey] = null;
    }

    // ── Actions ───────────────────────────────────────────────────────────

    /**
     * Starts both audits simultaneously (checklist and board).
     * Creates new audit documents in Firestore for both types.
     */
    async function startAudits(): Promise<void> {
      const auditorId = authStore.firebaseUser?.uid;

      if (!auditorId) {
        throw new Error('Cannot start audits: no authenticated user.');
      }

      if (!turma.value) {
        throw new Error('Cannot start audits: select turma before starting.');
      }

      loading.value = true;
      error.value = null;

      try {
        const today = getTodayKey();
        const sessionId = today;

        // Create both audits in parallel
        const [checklistId, boardId] = await Promise.all([
          checklistAuditService.createAudit(sessionId, today, turma.value, auditorId),
          boardAuditService.createAudit(sessionId, today, turma.value, auditorId),
        ]);

        checklistAuditId.value = checklistId;
        boardAuditId.value = boardId;
        draftDate.value = today;
        draftAuditorId.value = auditorId;
        draftCompleted.value = false;
      } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        loading.value = false;
      }
    }

    function setTurma(value: 'A e C' | 'B e D' | null): void {
      turma.value = value;
    }

    /**
     * Saves a single process for a specific audit type.
     *
     * @param type 'rto' or 'board5s'
     * @param processKey Process to save
     */
    async function saveProcess(type: AuditType, processKey: DualAuditProcessKey): Promise<void> {
      loading.value = true;
      error.value = null;

      try {
        await persistProcess(type, processKey);
      } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        loading.value = false;
      }
    }

    /**
     * Completes both audits (must be fully filled).
     * Persists all remaining process data and marks audits as completed.
     */
    async function finishAudits(): Promise<void> {
      if (!checklistAuditId.value || !boardAuditId.value) {
        throw new Error('Cannot finish audits: one or both audits not started.');
      }

      if (!allComplete.value) {
        const checklistRemaining = RTO_PROCESS_KEYS.length - checklistCompletedCount.value;
        const boardRemaining = BOARD5S_PROCESS_KEYS.length - boardCompletedCount.value;
        throw new Error(
          `Cannot finish audits: Checklist has ${checklistRemaining} remaining, Board has ${boardRemaining} remaining.`,
        );
      }

      // Validate all RTO processes
      for (const processKey of RTO_PROCESS_KEYS) {
        if (
          processKey === 'printer'
            ? !isPrinterReadyForSave(checklistPrinterState, checklistPrinterFiles)
            : !isProcessReadyForSave(checklistProcessState, checklistProcessFiles, processKey)
        ) {
          throw new Error(`Checklist: ${processKey} is incomplete.`);
        }
      }

      // Validate all board 5S processes
      for (const processKey of BOARD5S_PROCESS_KEYS) {
        if (!isProcessReadyForSave(boardProcessState, boardProcessFiles, processKey)) {
          throw new Error(`Board: ${processKey} is incomplete.`);
        }
      }

      loading.value = true;
      error.value = null;

      try {
        // Persist all remaining RTO processes
        for (const processKey of RTO_PROCESS_KEYS) {
          await persistProcess('rto', processKey);
        }

        // Persist all remaining board 5S processes
        for (const processKey of BOARD5S_PROCESS_KEYS) {
          await persistProcess('board5s', processKey);
        }

        // Complete both audits
        await Promise.all([
          checklistAuditService.completeAudit(checklistAuditId.value),
          boardAuditService.completeAudit(boardAuditId.value),
        ]);

        resetState();
      } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        loading.value = false;
      }
    }

    /**
     * Checks if today's audit session is completed (for dashboard display).
     */
    function checkTodaysDraft(): {
      checklistId: string;
      boardId: string;
      checklistCompletedCount: number;
      boardCompletedCount: number;
      completed: boolean;
    } | null {
      const auditorId = authStore.firebaseUser?.uid;

      if (!auditorId || draftAuditorId.value !== auditorId || draftDate.value !== getTodayKey()) {
        return null;
      }

      if (draftCompleted.value) {
        if (!draftCompletedChecklistId.value || !draftCompletedBoardId.value) return null;

        return {
          checklistId: draftCompletedChecklistId.value,
          boardId: draftCompletedBoardId.value,
          checklistCompletedCount: RTO_PROCESS_KEYS.length,
          boardCompletedCount: BOARD5S_PROCESS_KEYS.length,
          completed: true,
        };
      }

      if (!checklistAuditId.value || !boardAuditId.value) return null;

      return {
        checklistId: checklistAuditId.value,
        boardId: boardAuditId.value,
        checklistCompletedCount: checklistCompletedCount.value,
        boardCompletedCount: boardCompletedCount.value,
        completed: false,
      };
    }

    // ── Public API ────────────────────────────────────────────────────────

    return {
      // State
      checklistAuditId,
      boardAuditId,
      checklistProcessState,
      boardProcessState,
      checklistProcessFiles,
      boardProcessFiles,
      checklistPrinterState,
      checklistPrinterFiles,
      loading,
      error,
      turma,
      // Computed
      checklistCompletedCount,
      boardCompletedCount,
      checklistComplete,
      boardComplete,
      allComplete,
      // Actions
      startAudits,
      setTurma,
      saveProcess,
      finishAudits,
      checkTodaysDraft,
    };
  },
  {
    persist: {
      key: 'dual-audit-form-draft-v1',
      pick: [
        'checklistAuditId',
        'boardAuditId',
        'checklistProcessState',
        'checklistPrinterState',
        'boardProcessState',
        'turma',
        'draftDate',
        'draftAuditorId',
        'draftCompleted',
        'draftCompletedChecklistId',
        'draftCompletedBoardId',
      ],
    },
  },
);
