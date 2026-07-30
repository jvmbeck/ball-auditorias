import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';
import { DAILY5S_PROCESS_DEFINITIONS } from 'src/services/daily5s';
import { ensureAudit, updateProcess } from 'src/services/daily5s/daily5sAuditService';
import { isDaily5sIssueReason } from 'src/services/daily5s/daily5sDefinitions';
import type {
  Daily5sAuditProcessKey,
  Daily5sRatingValue,
  AuditTurma,
  Daily5sIssueReason,
} from 'src/types/audit';

interface Daily5sProcessEntry {
  rating: Daily5sRatingValue | null;
  grade1Reason: string[];
  grade1Comment: string;
}

type Daily5sProcessState = Record<Daily5sAuditProcessKey, Daily5sProcessEntry>;
type Daily5sProcessFiles = Record<Daily5sAuditProcessKey, File[]>;
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
    acc[key] = { rating: null, grade1Reason: [], grade1Comment: '' };
    return acc;
  }, {} as Daily5sProcessState);
}

function buildInitialProcessFiles(): Daily5sProcessFiles {
  return DAILY5S_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {} as Daily5sProcessFiles);
}

function buildInitialSavedState(): Daily5sSavedState {
  return DAILY5S_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as Daily5sSavedState);
}

export const useDaily5sAuditStore = defineStore('daily5sAudit', () => {
  const authStore = useAuthStore();

  const turma = ref<AuditTurma>('A e C');
  const selectedAuditDate = ref<string>(getTodayKey());
  const selectedProcessKeys = ref<Daily5sAuditProcessKey[]>([]);

  const processState = reactive<Daily5sProcessState>(buildInitialProcessState());
  const processFiles = reactive<Daily5sProcessFiles>(buildInitialProcessFiles());
  const savedProcesses = reactive<Daily5sSavedState>(buildInitialSavedState());

  const loading = ref(false);
  const error = ref<string | null>(null);

  const selectedCount = computed(() => selectedProcessKeys.value.length);

  const ratedCount = computed(
    () => selectedProcessKeys.value.filter((key) => processState[key]?.rating !== null).length,
  );

  const allSelectedValid = computed(() => {
    if (!selectedProcessKeys.value.length) {
      return false;
    }

    return selectedProcessKeys.value.every((key) => {
      const entry = processState[key];
      if (!entry || entry.rating === null) {
        return false;
      }
      const { rating, grade1Reason } = entry;
      if (rating === null) {
        return false;
      }

      if (rating !== 1) {
        return true;
      }

      return grade1Reason.length > 0 && processFiles[key].length > 0;
    });
  });

  function clearProcessStates(): void {
    DAILY5S_KEYS.forEach((key) => {
      processState[key] = { rating: null, grade1Reason: [], grade1Comment: '' };
      processFiles[key] = [];
      savedProcesses[key] = false;
    });
  }

  function setTurma(value: AuditTurma): void {
    turma.value = value;
  }

  function setAuditDate(value: string): void {
    if (!value || value === selectedAuditDate.value) {
      return;
    }

    selectedAuditDate.value = value;
  }

  const DAILY5S_KEY_SET = new Set(DAILY5S_KEYS);

  function setSelectedProcesses(processKeys: Daily5sAuditProcessKey[]): void {
    const unique = [...new Set(processKeys)].filter((key) => DAILY5S_KEY_SET.has(key));
    selectedProcessKeys.value = unique;
  }

  function initialize(): void {
    const auditorId = authStore.firebaseUser?.uid;

    if (!auditorId) {
      throw new Error('Cannot initialize daily 5S audit: no authenticated user.');
    }

    selectedProcessKeys.value = [];
    clearProcessStates();
  }

  async function ensureAuditExists(): Promise<void> {
    const auditorId = authStore.firebaseUser?.uid;

    if (!auditorId) {
      throw new Error('Cannot start daily 5S audit: no authenticated user.');
    }

    await ensureAudit(selectedAuditDate.value, turma.value, auditorId);
  }

  async function persistProcess(processKey: Daily5sAuditProcessKey): Promise<void> {
    const auditorId = authStore.firebaseUser?.uid;

    if (!auditorId) {
      throw new Error('Cannot save daily 5S process: no authenticated user.');
    }

    if (!selectedProcessKeys.value.includes(processKey)) {
      throw new Error('Selecione o processo antes de salvar a avaliacao.');
    }

    const { rating, grade1Reason, grade1Comment } = processState[processKey];
    if (rating === null) {
      throw new Error('Selecione uma nota (1, 3 ou 5) para salvar o processo.');
    }

    const normalizedReasons = grade1Reason
      .map((reason) => reason.trim())
      .filter((reason): reason is string => reason.length > 0);
    const trimmedGrade1Comment = grade1Comment.trim();
    const files = processFiles[processKey];

    let validReasons: Daily5sIssueReason[] | null = null;
    if (rating === 1) {
      if (!normalizedReasons.length) {
        throw new Error('Motivo obrigatorio para nota 1.');
      }

      if (!normalizedReasons.every((reason) => isDaily5sIssueReason(reason))) {
        throw new Error('Motivo invalido para nota 1.');
      }

      if (!files.length) {
        throw new Error('Imagem obrigatoria para nota 1.');
      }
      validReasons = normalizedReasons;
    }

    await ensureAuditExists();

    const processData = {
      rating,
      grade1Reason: validReasons,
      grade1Comment: rating === 1 ? trimmedGrade1Comment || null : null,
      inspectorId: auditorId,
    };

    await updateProcess(
      selectedAuditDate.value,
      turma.value,
      processKey,
      rating === 1 ? files : null,
      processData,
    );

    processFiles[processKey] = [];
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

  return {
    turma,
    selectedAuditDate,
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
    setAuditDate,
    setSelectedProcesses,
    initialize,
    saveProcess,
  };
});
