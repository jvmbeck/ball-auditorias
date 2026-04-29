import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  fetchFailuresByDateAndProcess,
  fetchFailuresByProcess,
  fetchFailuresByProcessAndTurma,
  fetchFailuresOverTime,
  fetchProcessFailureRates,
} from 'src/services/audit';
import type {
  FailuresByDateAndProcessData,
  FailuresByProcessAndTurmaData,
  FailuresByProcessData,
  FailuresOverTimeData,
  ProcessFailureRatesData,
  AuditType,
} from 'src/types/audit';

const CACHE_MAX_AGE_MS = 15 * 60 * 1000;

const EMPTY_FAILURES_OVER_TIME: FailuresOverTimeData = {
  labels: [],
  data: [],
  countsByDate: {},
};

const EMPTY_FAILURES_BY_PROCESS: FailuresByProcessData = {
  labels: [],
  data: [],
  countsByProcess: {},
  mostProblematicProcess: null,
};

const EMPTY_PROCESS_FAILURE_RATES: ProcessFailureRatesData = {
  labels: [],
  data: [],
  totalsByProcess: {},
  failuresByProcess: {},
};

const EMPTY_FAILURES_BY_PROCESS_AND_TURMA: FailuresByProcessAndTurmaData = {
  labels: [],
  seriesAC: [],
  seriesBD: [],
};

const EMPTY_FAILURES_BY_DATE_AND_PROCESS: FailuresByDateAndProcessData = {
  labels: [],
  series: [],
};

function isStale(lastFetchedAt: number | null): boolean {
  if (!lastFetchedAt) {
    return true;
  }

  return Date.now() - lastFetchedAt > CACHE_MAX_AGE_MS;
}

export const useAnalyticsStore = defineStore(
  'analytics',
  () => {
    // ── Legacy state (for backward compatibility) ──────────────────────────────

    const failuresOverTime = ref<FailuresOverTimeData>(EMPTY_FAILURES_OVER_TIME);
    const failuresByProcess = ref<FailuresByProcessData>(EMPTY_FAILURES_BY_PROCESS);
    const processFailureRates = ref<ProcessFailureRatesData>(EMPTY_PROCESS_FAILURE_RATES);
    const failuresByProcessAndTurma = ref<FailuresByProcessAndTurmaData>(
      EMPTY_FAILURES_BY_PROCESS_AND_TURMA,
    );
    const failuresByDateAndProcess = ref<FailuresByDateAndProcessData>(
      EMPTY_FAILURES_BY_DATE_AND_PROCESS,
    );

    const overTimeLoading = ref(false);
    const byProcessLoading = ref(false);
    const processFailureRateLoading = ref(false);
    const byProcessAndTurmaLoading = ref(false);
    const byDateAndProcessLoading = ref(false);

    const overTimeError = ref<string | null>(null);
    const byProcessError = ref<string | null>(null);
    const processFailureRateError = ref<string | null>(null);
    const byProcessAndTurmaError = ref<string | null>(null);
    const byDateAndProcessError = ref<string | null>(null);

    const overTimeLastFetchedAt = ref<number | null>(null);
    const byProcessLastFetchedAt = ref<number | null>(null);
    const processFailureRateLastFetchedAt = ref<number | null>(null);
    const byProcessAndTurmaLastFetchedAt = ref<number | null>(null);
    const byProcessAndTurmaDays = ref(30);
    const byDateAndProcessLastFetchedAt = ref<number | null>(null);
    const byDateAndProcessDays = ref(30);

    // ── Dual-type state ───────────────────────────────────────────────────────

    const checklistFailuresOverTime = ref<FailuresOverTimeData>(EMPTY_FAILURES_OVER_TIME);
    const boardFailuresOverTime = ref<FailuresOverTimeData>(EMPTY_FAILURES_OVER_TIME);

    const checklistFailuresByProcess = ref<FailuresByProcessData>(EMPTY_FAILURES_BY_PROCESS);
    const boardFailuresByProcess = ref<FailuresByProcessData>(EMPTY_FAILURES_BY_PROCESS);

    const checklistProcessFailureRates = ref<ProcessFailureRatesData>(EMPTY_PROCESS_FAILURE_RATES);
    const boardProcessFailureRates = ref<ProcessFailureRatesData>(EMPTY_PROCESS_FAILURE_RATES);

    const checklistOverTimeLoading = ref(false);
    const boardOverTimeLoading = ref(false);

    const checklistByProcessLoading = ref(false);
    const boardByProcessLoading = ref(false);

    const checklistProcessFailureRateLoading = ref(false);
    const boardProcessFailureRateLoading = ref(false);

    // Request deduplication
    let overTimeRequest: Promise<void> | null = null;
    let byProcessRequest: Promise<void> | null = null;
    let processFailureRateRequest: Promise<void> | null = null;
    let byProcessAndTurmaRequest: Promise<void> | null = null;
    let byDateAndProcessRequest: Promise<void> | null = null;

    let checklistOverTimeRequest: Promise<void> | null = null;
    let boardOverTimeRequest: Promise<void> | null = null;
    let checklistByProcessRequest: Promise<void> | null = null;
    let boardByProcessRequest: Promise<void> | null = null;
    let checklistProcessFailureRateRequest: Promise<void> | null = null;
    let boardProcessFailureRateRequest: Promise<void> | null = null;

    // ── Legacy methods (for backward compatibility) ────────────────────────

    async function loadFailuresOverTime(force = false): Promise<void> {
      const hasCachedData = failuresOverTime.value.labels.length > 0;

      if (!force && hasCachedData && !isStale(overTimeLastFetchedAt.value)) {
        return;
      }

      if (overTimeRequest) {
        return overTimeRequest;
      }

      overTimeRequest = (async () => {
        overTimeLoading.value = true;
        overTimeError.value = null;

        try {
          failuresOverTime.value = await fetchFailuresOverTime();
          overTimeLastFetchedAt.value = Date.now();
        } catch (err: unknown) {
          overTimeError.value =
            err instanceof Error ? err.message : 'Unable to load failure trend data.';
          throw err;
        } finally {
          overTimeLoading.value = false;
          overTimeRequest = null;
        }
      })();

      return overTimeRequest;
    }

    async function loadFailuresByProcess(force = false): Promise<void> {
      const hasCachedData = failuresByProcess.value.labels.length > 0;

      if (!force && hasCachedData && !isStale(byProcessLastFetchedAt.value)) {
        return;
      }

      if (byProcessRequest) {
        return byProcessRequest;
      }

      byProcessRequest = (async () => {
        byProcessLoading.value = true;
        byProcessError.value = null;

        try {
          failuresByProcess.value = await fetchFailuresByProcess();
          byProcessLastFetchedAt.value = Date.now();
        } catch (err: unknown) {
          byProcessError.value =
            err instanceof Error ? err.message : 'Unable to load failures by process.';
          throw err;
        } finally {
          byProcessLoading.value = false;
          byProcessRequest = null;
        }
      })();

      return byProcessRequest;
    }

    async function loadProcessFailureRates(force = false): Promise<void> {
      const hasCachedData = processFailureRates.value.labels.length > 0;

      if (!force && hasCachedData && !isStale(processFailureRateLastFetchedAt.value)) {
        return;
      }

      if (processFailureRateRequest) {
        return processFailureRateRequest;
      }

      processFailureRateRequest = (async () => {
        processFailureRateLoading.value = true;
        processFailureRateError.value = null;

        try {
          processFailureRates.value = await fetchProcessFailureRates();
          processFailureRateLastFetchedAt.value = Date.now();
        } catch (err: unknown) {
          processFailureRateError.value =
            err instanceof Error ? err.message : 'Unable to load process failure rates.';
          throw err;
        } finally {
          processFailureRateLoading.value = false;
          processFailureRateRequest = null;
        }
      })();

      return processFailureRateRequest;
    }

    // ── Dual-type methods ─────────────────────────────────────────────────

    async function loadFailuresOverTimeByType(type: AuditType, force = false): Promise<void> {
      const targetRef = type === 'rto' ? checklistFailuresOverTime : boardFailuresOverTime;
      const loadingRef = type === 'rto' ? checklistOverTimeLoading : boardOverTimeLoading;
      const requestRef = type === 'rto' ? checklistOverTimeRequest : boardOverTimeRequest;

      const hasCachedData = targetRef.value.labels.length > 0;

      if (!force && hasCachedData && !isStale(overTimeLastFetchedAt.value)) {
        return;
      }

      if (requestRef) {
        return requestRef;
      }

      const request = (async () => {
        loadingRef.value = true;

        try {
          targetRef.value = await fetchFailuresOverTime(type);
        } finally {
          loadingRef.value = false;
          if (type === 'rto') {
            checklistOverTimeRequest = null;
          } else {
            boardOverTimeRequest = null;
          }
        }
      })();

      if (type === 'rto') {
        checklistOverTimeRequest = request;
      } else {
        boardOverTimeRequest = request;
      }

      return request;
    }

    async function loadFailuresByProcessByType(type: AuditType, force = false): Promise<void> {
      const targetRef = type === 'rto' ? checklistFailuresByProcess : boardFailuresByProcess;
      const loadingRef = type === 'rto' ? checklistByProcessLoading : boardByProcessLoading;
      const requestRef = type === 'rto' ? checklistByProcessRequest : boardByProcessRequest;

      const hasCachedData = targetRef.value.labels.length > 0;

      if (!force && hasCachedData && !isStale(byProcessLastFetchedAt.value)) {
        return;
      }

      if (requestRef) {
        return requestRef;
      }

      const request = (async () => {
        loadingRef.value = true;

        try {
          targetRef.value = await fetchFailuresByProcess(type);
        } finally {
          loadingRef.value = false;
          if (type === 'rto') {
            checklistByProcessRequest = null;
          } else {
            boardByProcessRequest = null;
          }
        }
      })();

      if (type === 'rto') {
        checklistByProcessRequest = request;
      } else {
        boardByProcessRequest = request;
      }

      return request;
    }

    async function loadProcessFailureRatesByType(type: AuditType, force = false): Promise<void> {
      const targetRef = type === 'rto' ? checklistProcessFailureRates : boardProcessFailureRates;
      const loadingRef =
        type === 'rto' ? checklistProcessFailureRateLoading : boardProcessFailureRateLoading;
      const requestRef =
        type === 'rto' ? checklistProcessFailureRateRequest : boardProcessFailureRateRequest;

      const hasCachedData = targetRef.value.labels.length > 0;

      if (!force && hasCachedData && !isStale(processFailureRateLastFetchedAt.value)) {
        return;
      }

      if (requestRef) {
        return requestRef;
      }

      const request = (async () => {
        loadingRef.value = true;

        try {
          targetRef.value = await fetchProcessFailureRates(type);
        } finally {
          loadingRef.value = false;
          if (type === 'rto') {
            checklistProcessFailureRateRequest = null;
          } else {
            boardProcessFailureRateRequest = null;
          }
        }
      })();

      if (type === 'rto') {
        checklistProcessFailureRateRequest = request;
      } else {
        boardProcessFailureRateRequest = request;
      }

      return request;
    }

    async function loadAllAnalyticsByType(type: AuditType, force = false): Promise<void> {
      await Promise.all([
        loadFailuresOverTimeByType(type, force),
        loadFailuresByProcessByType(type, force),
        loadProcessFailureRatesByType(type, force),
      ]);
    }

    async function loadFailuresByProcessAndTurma(
      type?: AuditType,
      force = false,
      days = 30,
    ): Promise<void> {
      const hasCachedData = failuresByProcessAndTurma.value.labels.length > 0;

      if (
        !force &&
        hasCachedData &&
        byProcessAndTurmaDays.value === days &&
        !isStale(byProcessAndTurmaLastFetchedAt.value)
      ) {
        return;
      }

      if (byProcessAndTurmaRequest) {
        return byProcessAndTurmaRequest;
      }

      byProcessAndTurmaRequest = (async () => {
        byProcessAndTurmaLoading.value = true;
        byProcessAndTurmaError.value = null;

        try {
          failuresByProcessAndTurma.value = await fetchFailuresByProcessAndTurma(type, days);
          byProcessAndTurmaDays.value = days;
          byProcessAndTurmaLastFetchedAt.value = Date.now();
        } catch (err: unknown) {
          byProcessAndTurmaError.value =
            err instanceof Error ? err.message : 'Unable to load failures by process and turma.';
          throw err;
        } finally {
          byProcessAndTurmaLoading.value = false;
          byProcessAndTurmaRequest = null;
        }
      })();

      return byProcessAndTurmaRequest;
    }

    async function loadFailuresByDateAndProcess(
      type?: AuditType,
      force = false,
      days = 30,
    ): Promise<void> {
      const hasCachedData = failuresByDateAndProcess.value.labels.length > 0;

      if (
        !force &&
        hasCachedData &&
        byDateAndProcessDays.value === days &&
        !isStale(byDateAndProcessLastFetchedAt.value)
      ) {
        return;
      }

      if (byDateAndProcessRequest) {
        return byDateAndProcessRequest;
      }

      byDateAndProcessRequest = (async () => {
        byDateAndProcessLoading.value = true;
        byDateAndProcessError.value = null;

        try {
          failuresByDateAndProcess.value = await fetchFailuresByDateAndProcess(type, days);
          byDateAndProcessDays.value = days;
          byDateAndProcessLastFetchedAt.value = Date.now();
        } catch (err: unknown) {
          byDateAndProcessError.value =
            err instanceof Error ? err.message : 'Unable to load failures by date and process.';
          throw err;
        } finally {
          byDateAndProcessLoading.value = false;
          byDateAndProcessRequest = null;
        }
      })();

      return byDateAndProcessRequest;
    }

    async function refreshAllAnalytics(days = 30): Promise<void> {
      await Promise.all([
        loadFailuresOverTime(true),
        loadFailuresByProcess(true),
        loadProcessFailureRates(true),
        loadFailuresByProcessAndTurma(undefined, true, days),
        loadFailuresByDateAndProcess(undefined, true, days),
      ]);
    }

    return {
      // Legacy
      failuresOverTime,
      failuresByProcess,
      processFailureRates,
      failuresByProcessAndTurma,
      failuresByDateAndProcess,
      overTimeLoading,
      byProcessLoading,
      processFailureRateLoading,
      byProcessAndTurmaLoading,
      byDateAndProcessLoading,
      overTimeError,
      byProcessError,
      processFailureRateError,
      byProcessAndTurmaError,
      byDateAndProcessError,
      overTimeLastFetchedAt,
      byProcessLastFetchedAt,
      processFailureRateLastFetchedAt,
      byProcessAndTurmaLastFetchedAt,
      byProcessAndTurmaDays,
      byDateAndProcessLastFetchedAt,
      byDateAndProcessDays,
      loadFailuresOverTime,
      loadFailuresByProcess,
      loadProcessFailureRates,
      loadFailuresByProcessAndTurma,
      loadFailuresByDateAndProcess,
      refreshAllAnalytics,
      // Dual-type
      checklistFailuresOverTime,
      boardFailuresOverTime,
      checklistFailuresByProcess,
      boardFailuresByProcess,
      checklistProcessFailureRates,
      boardProcessFailureRates,
      checklistOverTimeLoading,
      boardOverTimeLoading,
      checklistByProcessLoading,
      boardByProcessLoading,
      checklistProcessFailureRateLoading,
      boardProcessFailureRateLoading,
      loadFailuresOverTimeByType,
      loadFailuresByProcessByType,
      loadProcessFailureRatesByType,
      loadAllAnalyticsByType,
    };
  },
  {
    persist: {
      key: 'analytics-dashboard-cache-v2',
      pick: [
        // Legacy
        'failuresOverTime',
        'failuresByProcess',
        'processFailureRates',
        'failuresByProcessAndTurma',
        'failuresByDateAndProcess',
        'overTimeLastFetchedAt',
        'byProcessLastFetchedAt',
        'processFailureRateLastFetchedAt',
        'byProcessAndTurmaLastFetchedAt',
        'byProcessAndTurmaDays',
        'byDateAndProcessLastFetchedAt',
        'byDateAndProcessDays',
        // Dual-type
        'checklistFailuresOverTime',
        'boardFailuresOverTime',
        'checklistFailuresByProcess',
        'boardFailuresByProcess',
        'checklistProcessFailureRates',
        'boardProcessFailureRates',
      ],
    },
  },
);
