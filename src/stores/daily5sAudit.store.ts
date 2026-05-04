import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';
import {
  DAILY5S_PROCESS_DEFINITIONS,
  daily5sAuditService,
  getDaily5sResultsForAudit,
  getTodaysDaily5sStatus,
} from 'src/services/audit';
import type {
  Daily5sAuditProcessKey,
  Daily5sRatingValue,
  UpdatableProcessStatus,
} from 'src/types/audit';

interface Daily5sProcessEntry {
  rating: Daily5sRatingValue | null;
  comment: string;
}

type Daily5sProcessState = Record<Daily5sAuditProcessKey, Daily5sProcessEntry>;
type Daily5sProcessFiles = Record<Daily5sAuditProcessKey, File | null>;
type Daily5sSavedState = Record<Daily5sAuditProcessKey, boolean>;

const DAILY5S_KEYS = DAILY5S_PROCESS_DEFINITIONS.map((process) => process.key);

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildInitialProcessState(): Daily5sProcessState {
  return DAILY5S_KEYS.reduce((acc, key) => {
    acc[key] = { rating: null, comment: '' };
    return acc;
  }, {} as Daily5sProcessState);
}

function buildInitialProcessFiles(): Daily5sProcessFiles {
  return DAILY5S_KEYS.reduce((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as Daily5sProcessFiles);
}

function buildInitialSavedState(): Daily5sSavedState {
  return DAILY5S_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as Daily5sSavedState);
}

function toStatus(rating: Daily5sRatingValue): UpdatableProcessStatus {
  return rating === 1 ? 'not_updated' : 'updated';
}

export const useDaily5sAuditStore = defineStore(
  'daily5sAudit',
  () => {
    const authStore = useAuthStore();

    const auditId = ref<string | null>(null);
    const turma = ref<'A e C' | 'B e D' | null>(null);
    const selectedProcessKeys = ref<Daily5sAuditProcessKey[]>([]);

    const processState = reactive<Daily5sProcessState>(buildInitialProcessState());
    const processFiles = reactive<Daily5sProcessFiles>(buildInitialProcessFiles());
    const savedProcesses = reactive<Daily5sSavedState>(buildInitialSavedState());

    const loading = ref(false);
    const error = ref<string | null>(null);

    const draftDate = ref<string | null>(null);
    const draftAuditorId = ref<string | null>(null);
    const draftCompleted = ref(false);
    const draftCompletedAuditId = ref<string | null>(null);
    const dayRolloverNotice = ref(false);

    const selectedCount = computed(() => selectedProcessKeys.value.length);

    const ratedCount = computed(
      () => selectedProcessKeys.value.filter((key) => processState[key].rating !== null).length,
    );

    const allSelectedValid = computed(() => {
      if (!selectedProcessKeys.value.length) {
        return false;
      }

      return selectedProcessKeys.value.every((key) => {
        const { rating, comment } = processState[key];
        if (rating === null) {
          return false;
        }

        if (rating !== 1) {
          return true;
        }

        return Boolean(comment.trim()) && Boolean(processFiles[key]);
      });
    });

    function clearProcessStates(): void {
      DAILY5S_KEYS.forEach((key) => {
        processState[key] = { rating: null, comment: '' };
        processFiles[key] = null;
        savedProcesses[key] = false;
      });
    }

    function clearActiveDraftState(preserveTurma = true): void {
      auditId.value = null;
      error.value = null;
      selectedProcessKeys.value = [];

      if (!preserveTurma) {
        turma.value = null;
      }

      clearProcessStates();
    }

    function discardStaleDraftIfNeeded(): void {
      const today = getTodayKey();
      const auditorId = authStore.firebaseUser?.uid ?? null;

      const isDifferentAuditor = Boolean(
        draftAuditorId.value && draftAuditorId.value !== auditorId,
      );
      const isDifferentDay = Boolean(draftDate.value && draftDate.value !== today);
      const hasStaleAuditId = Boolean(auditId.value && auditId.value !== today);

      if (!isDifferentAuditor && !isDifferentDay && !hasStaleAuditId) {
        return;
      }

      clearActiveDraftState(!isDifferentAuditor);
      dayRolloverNotice.value = isDifferentDay || hasStaleAuditId;

      draftDate.value = null;
      draftAuditorId.value = auditorId;
      draftCompleted.value = false;
      draftCompletedAuditId.value = null;
    }

    function setTurma(value: 'A e C' | 'B e D' | null): void {
      turma.value = value;
    }

    function setSelectedProcesses(processKeys: Daily5sAuditProcessKey[]): void {
      const unique = [...new Set(processKeys)];
      selectedProcessKeys.value = unique;
    }

    function consumeDayRolloverNotice(): boolean {
      const shouldShow = dayRolloverNotice.value;
      dayRolloverNotice.value = false;
      return shouldShow;
    }

    async function hydrateSavedProcesses(existingAuditId: string): Promise<void> {
      const persisted = await getDaily5sResultsForAudit(existingAuditId);
      const selected = new Set<Daily5sAuditProcessKey>();

      clearProcessStates();

      persisted.forEach((result) => {
        selected.add(result.process);

        processState[result.process] = {
          rating: result.rating,
          comment: result.comment,
        };
        processFiles[result.process] = null;
        savedProcesses[result.process] = true;
      });

      selectedProcessKeys.value = [...selected];
    }

    async function initialize(): Promise<void> {
      const auditorId = authStore.firebaseUser?.uid;

      if (!auditorId) {
        return;
      }

      discardStaleDraftIfNeeded();

      // Keep local draft if it already belongs to today and this user.
      if (
        auditId.value &&
        draftDate.value === getTodayKey() &&
        draftAuditorId.value === auditorId &&
        !draftCompleted.value
      ) {
        return;
      }

      const todaysStatus = await getTodaysDaily5sStatus(auditorId);
      if (!todaysStatus) {
        return;
      }

      draftDate.value = getTodayKey();
      draftAuditorId.value = auditorId;
      draftCompleted.value = todaysStatus.completed;
      draftCompletedAuditId.value = todaysStatus.completed ? todaysStatus.auditId : null;

      if (todaysStatus.turma) {
        turma.value = todaysStatus.turma;
      }

      if (todaysStatus.completed) {
        auditId.value = null;
        await hydrateSavedProcesses(todaysStatus.auditId);
        return;
      }

      auditId.value = todaysStatus.auditId;
      await hydrateSavedProcesses(todaysStatus.auditId);
    }

    async function ensureAuditStarted(): Promise<void> {
      const auditorId = authStore.firebaseUser?.uid;

      if (!auditorId) {
        throw new Error('Cannot start daily 5S audit: no authenticated user.');
      }

      if (!turma.value) {
        throw new Error('Selecione a turma antes de iniciar a auditoria Daily 5S.');
      }

      if (auditId.value) {
        return;
      }

      const today = getTodayKey();
      const createdAuditId = await daily5sAuditService.createAudit(today, today, turma.value, auditorId);

      auditId.value = createdAuditId;
      draftDate.value = today;
      draftAuditorId.value = auditorId;
      draftCompleted.value = false;
      draftCompletedAuditId.value = null;
    }

    async function persistProcess(processKey: Daily5sAuditProcessKey): Promise<void> {
      if (!selectedProcessKeys.value.includes(processKey)) {
        throw new Error('Selecione o processo antes de salvar a avaliacao.');
      }

      const { rating, comment } = processState[processKey];
      if (rating === null) {
        throw new Error('Selecione uma nota (1, 3 ou 5) para salvar o processo.');
      }

      const trimmedComment = comment.trim();
      const file = processFiles[processKey];

      if (rating === 1) {
        if (!trimmedComment) {
          throw new Error('Descricao obrigatoria para nota 1.');
        }

        if (!file) {
          throw new Error('Imagem obrigatoria para nota 1.');
        }
      }

      await ensureAuditStarted();

      await daily5sAuditService.updateProcess(
        auditId.value as string,
        getTodayKey(),
        turma.value as 'A e C' | 'B e D',
        processKey,
        toStatus(rating),
        rating === 1 ? trimmedComment : null,
        rating === 1 ? file : null,
        { rating },
      );

      processFiles[processKey] = null;
      savedProcesses[processKey] = true;
    }

    async function saveProcess(processKey: Daily5sAuditProcessKey): Promise<void> {
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

    async function finishAudit(): Promise<void> {
      if (!selectedProcessKeys.value.length) {
        throw new Error('Selecione ao menos um processo para finalizar a auditoria Daily 5S.');
      }

      if (!allSelectedValid.value) {
        throw new Error('Complete as avaliacoes dos processos selecionados antes de finalizar.');
      }

      loading.value = true;
      error.value = null;

      try {
        await ensureAuditStarted();

        for (const processKey of selectedProcessKeys.value) {
          await persistProcess(processKey);
        }

        await daily5sAuditService.completeAudit(auditId.value as string);

        draftCompletedAuditId.value = auditId.value;
        draftCompleted.value = true;
        auditId.value = null;
      } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        loading.value = false;
      }
    }

    function checkTodaysDraft(): {
      auditId: string;
      selectedProcesses: Daily5sAuditProcessKey[];
      ratedCount: number;
      completed: boolean;
    } | null {
      discardStaleDraftIfNeeded();

      const auditorId = authStore.firebaseUser?.uid;

      if (!auditorId || draftAuditorId.value !== auditorId || draftDate.value !== getTodayKey()) {
        return null;
      }

      if (draftCompleted.value) {
        if (!draftCompletedAuditId.value) {
          return null;
        }

        return {
          auditId: draftCompletedAuditId.value,
          selectedProcesses: selectedProcessKeys.value,
          ratedCount: selectedProcessKeys.value.length,
          completed: true,
        };
      }

      if (!auditId.value) {
        return null;
      }

      return {
        auditId: auditId.value,
        selectedProcesses: selectedProcessKeys.value,
        ratedCount: ratedCount.value,
        completed: false,
      };
    }

    return {
      auditId,
      turma,
      selectedProcessKeys,
      processState,
      processFiles,
      savedProcesses,
      loading,
      error,
      selectedCount,
      ratedCount,
      allSelectedValid,
      setTurma,
      setSelectedProcesses,
      initialize,
      saveProcess,
      finishAudit,
      checkTodaysDraft,
      consumeDayRolloverNotice,
    };
  },
  {
    persist: {
      key: 'daily-5s-audit-form-draft-v1',
      pick: [
        'auditId',
        'turma',
        'selectedProcessKeys',
        'processState',
        'savedProcesses',
        'draftDate',
        'draftAuditorId',
        'draftCompleted',
        'draftCompletedAuditId',
      ],
    },
  },
);
