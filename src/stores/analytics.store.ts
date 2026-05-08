import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  fetchDaily5sMonthlyHeatmap,
  fetchFailuresByProcess,
  fetchFailuresByProcessAndTurma,
  fetchFailuresOverTime,
  fetchProcessFailureRates,
} from 'src/services/audit';
import type {
  FailuresByProcessAndTurmaData,
  FailuresByProcessData,
  FailuresOverTimeData,
  ProcessFailureRatesData,
  AuditType,
  Daily5sMonthlyHeatmapData,
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

const EMPTY_DAILY5S_MONTHLY_HEATMAP: Daily5sMonthlyHeatmapData = {
  monthKey: '',
  processLabels: [],
  xAxisCategories: [],
  points: [],
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
    const daily5sMonthlyHeatmap = ref<Daily5sMonthlyHeatmapData>(EMPTY_DAILY5S_MONTHLY_HEATMAP);

    const overTimeLoading = ref(false);
    const byProcessLoading = ref(false);
    const processFailureRateLoading = ref(false);
    const daily5sMonthlyHeatmapLoading = ref(false);

    const overTimeError = ref<string | null>(null);
    const byProcessError = ref<string | null>(null);
    const processFailureRateError = ref<string | null>(null);
    const daily5sMonthlyHeatmapError = ref<string | null>(null);

    const overTimeLastFetchedAt = ref<number | null>(null);
    const byProcessLastFetchedAt = ref<number | null>(null);
    const processFailureRateLastFetchedAt = ref<number | null>(null);
    const daily5sMonthlyHeatmapLastFetchedAt = ref<number | null>(null);
    const daily5sMonthlyHeatmapMonth = ref<string | null>(null);

    // ── Dual-type state ───────────────────────────────────────────────────────

    const checklistFailuresOverTime = ref<FailuresOverTimeData>(EMPTY_FAILURES_OVER_TIME);
    const boardFailuresOverTime = ref<FailuresOverTimeData>(EMPTY_FAILURES_OVER_TIME);

    const checklistFailuresByProcess = ref<FailuresByProcessData>(EMPTY_FAILURES_BY_PROCESS);
    const boardFailuresByProcess = ref<FailuresByProcessData>(EMPTY_FAILURES_BY_PROCESS);

    const checklistProcessFailureRates = ref<ProcessFailureRatesData>(EMPTY_PROCESS_FAILURE_RATES);
    const boardProcessFailureRates = ref<ProcessFailureRatesData>(EMPTY_PROCESS_FAILURE_RATES);

    const checklistFailuresByProcessAndTurma = ref<FailuresByProcessAndTurmaData>(
      EMPTY_FAILURES_BY_PROCESS_AND_TURMA,
    );
    const boardFailuresByProcessAndTurma = ref<FailuresByProcessAndTurmaData>(
      EMPTY_FAILURES_BY_PROCESS_AND_TURMA,
    );

    const checklistOverTimeLoading = ref(false);
    const boardOverTimeLoading = ref(false);

    const checklistByProcessLoading = ref(false);
    const boardByProcessLoading = ref(false);

    const checklistProcessFailureRateLoading = ref(false);
    const boardProcessFailureRateLoading = ref(false);

    const checklistByProcessAndTurmaLoading = ref(false);
    const boardByProcessAndTurmaLoading = ref(false);
    const checklistByProcessAndTurmaError = ref<string | null>(null);
    const boardByProcessAndTurmaError = ref<string | null>(null);

    const checklistByProcessAndTurmaLastFetchedAt = ref<number | null>(null);
    const boardByProcessAndTurmaLastFetchedAt = ref<number | null>(null);
    const checklistByProcessAndTurmaDays = ref(30);
    const boardByProcessAndTurmaDays = ref(30);

    // Request deduplication
    let overTimeRequest: Promise<void> | null = null;
    let byProcessRequest: Promise<void> | null = null;
    let processFailureRateRequest: Promise<void> | null = null;
    let daily5sMonthlyHeatmapRequest: Promise<void> | null = null;

    let checklistOverTimeRequest: Promise<void> | null = null;
    let boardOverTimeRequest: Promise<void> | null = null;
    let checklistByProcessRequest: Promise<void> | null = null;
    let boardByProcessRequest: Promise<void> | null = null;
    let checklistProcessFailureRateRequest: Promise<void> | null = null;
    let boardProcessFailureRateRequest: Promise<void> | null = null;
    let checklistByProcessAndTurmaRequest: Promise<void> | null = null;
    let boardByProcessAndTurmaRequest: Promise<void> | null = null;

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

    async function loadFailuresByProcessAndTurmaByType(
      type: AuditType,
      force = false,
      days = 30,
    ): Promise<void> {
      const targetRef =
        type === 'rto' ? checklistFailuresByProcessAndTurma : boardFailuresByProcessAndTurma;
      const loadingRef =
        type === 'rto' ? checklistByProcessAndTurmaLoading : boardByProcessAndTurmaLoading;
      const requestRef =
        type === 'rto' ? checklistByProcessAndTurmaRequest : boardByProcessAndTurmaRequest;
      const lastFetchedRef =
        type === 'rto'
          ? checklistByProcessAndTurmaLastFetchedAt
          : boardByProcessAndTurmaLastFetchedAt;
      const daysRef = type === 'rto' ? checklistByProcessAndTurmaDays : boardByProcessAndTurmaDays;

      const hasCachedData = targetRef.value.labels.length > 0;

      if (!force && hasCachedData && daysRef.value === days && !isStale(lastFetchedRef.value)) {
        return;
      }

      if (requestRef) {
        return requestRef;
      }

      const request = (async () => {
        loadingRef.value = true;
        if (type === 'rto') {
          checklistByProcessAndTurmaError.value = null;
        } else {
          boardByProcessAndTurmaError.value = null;
        }

        try {
          targetRef.value = await fetchFailuresByProcessAndTurma(type, days);
          daysRef.value = days;
          lastFetchedRef.value = Date.now();
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Unable to load failures by process and turma.';
          if (type === 'rto') {
            checklistByProcessAndTurmaError.value = message;
          } else {
            boardByProcessAndTurmaError.value = message;
          }
          throw err;
        } finally {
          loadingRef.value = false;
          if (type === 'rto') {
            checklistByProcessAndTurmaRequest = null;
          } else {
            boardByProcessAndTurmaRequest = null;
          }
        }
      })();

      if (type === 'rto') {
        checklistByProcessAndTurmaRequest = request;
      } else {
        boardByProcessAndTurmaRequest = request;
      }

      return request;
    }

    async function loadAllAnalyticsByType(
      type: AuditType,
      force = false,
      days = 30,
    ): Promise<void> {
      await Promise.all([
        loadFailuresOverTimeByType(type, force),
        loadFailuresByProcessByType(type, force),
        loadProcessFailureRatesByType(type, force),
        loadFailuresByProcessAndTurmaByType(type, force, days),
      ]);
    }

    async function refreshAllAnalytics(days = 30): Promise<void> {
      await Promise.all([
        loadFailuresOverTime(true),
        loadFailuresByProcess(true),
        loadProcessFailureRates(true),
        loadFailuresByProcessAndTurmaByType('rto', true, days),
        loadFailuresByProcessAndTurmaByType('board5s', true, days),
      ]);
    }

    async function loadDaily5sMonthlyHeatmap(monthKey: string, force = false): Promise<void> {
      const hasCachedData = daily5sMonthlyHeatmap.value.processLabels.length > 0;

      if (
        !force &&
        hasCachedData &&
        daily5sMonthlyHeatmapMonth.value === monthKey &&
        !isStale(daily5sMonthlyHeatmapLastFetchedAt.value)
      ) {
        return;
      }

      if (daily5sMonthlyHeatmapRequest) {
        return daily5sMonthlyHeatmapRequest;
      }

      daily5sMonthlyHeatmapRequest = (async () => {
        daily5sMonthlyHeatmapLoading.value = true;
        daily5sMonthlyHeatmapError.value = null;

        try {
          daily5sMonthlyHeatmap.value = await fetchDaily5sMonthlyHeatmap(monthKey);
          daily5sMonthlyHeatmapMonth.value = daily5sMonthlyHeatmap.value.monthKey;
          daily5sMonthlyHeatmapLastFetchedAt.value = Date.now();
        } catch (err: unknown) {
          daily5sMonthlyHeatmapError.value =
            err instanceof Error ? err.message : 'Unable to load Daily 5S monthly heatmap.';
          throw err;
        } finally {
          daily5sMonthlyHeatmapLoading.value = false;
          daily5sMonthlyHeatmapRequest = null;
        }
      })();

      return daily5sMonthlyHeatmapRequest;
    }

    async function refreshDaily5sMonthlyHeatmap(monthKey: string): Promise<void> {
      await loadDaily5sMonthlyHeatmap(monthKey, true);
    }

    return {
      // Legacy
      failuresOverTime,
      failuresByProcess,
      processFailureRates,
      daily5sMonthlyHeatmap,
      overTimeLoading,
      byProcessLoading,
      processFailureRateLoading,
      daily5sMonthlyHeatmapLoading,
      overTimeError,
      byProcessError,
      processFailureRateError,
      daily5sMonthlyHeatmapError,
      overTimeLastFetchedAt,
      byProcessLastFetchedAt,
      processFailureRateLastFetchedAt,
      daily5sMonthlyHeatmapLastFetchedAt,
      daily5sMonthlyHeatmapMonth,
      loadFailuresOverTime,
      loadFailuresByProcess,
      loadProcessFailureRates,
      refreshAllAnalytics,
      loadDaily5sMonthlyHeatmap,
      refreshDaily5sMonthlyHeatmap,
      // Dual-type
      checklistFailuresOverTime,
      boardFailuresOverTime,
      checklistFailuresByProcess,
      boardFailuresByProcess,
      checklistProcessFailureRates,
      boardProcessFailureRates,
      checklistFailuresByProcessAndTurma,
      boardFailuresByProcessAndTurma,
      checklistOverTimeLoading,
      boardOverTimeLoading,
      checklistByProcessLoading,
      boardByProcessLoading,
      checklistProcessFailureRateLoading,
      boardProcessFailureRateLoading,
      checklistByProcessAndTurmaLoading,
      boardByProcessAndTurmaLoading,
      checklistByProcessAndTurmaError,
      boardByProcessAndTurmaError,
      checklistByProcessAndTurmaLastFetchedAt,
      boardByProcessAndTurmaLastFetchedAt,
      checklistByProcessAndTurmaDays,
      boardByProcessAndTurmaDays,
      loadFailuresOverTimeByType,
      loadFailuresByProcessByType,
      loadProcessFailureRatesByType,
      loadFailuresByProcessAndTurmaByType,
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
        'overTimeLastFetchedAt',
        'byProcessLastFetchedAt',
        'processFailureRateLastFetchedAt',
        'daily5sMonthlyHeatmap',
        'daily5sMonthlyHeatmapLastFetchedAt',
        'daily5sMonthlyHeatmapMonth',
        // Dual-type
        'checklistFailuresOverTime',
        'boardFailuresOverTime',
        'checklistFailuresByProcess',
        'boardFailuresByProcess',
        'checklistProcessFailureRates',
        'boardProcessFailureRates',
        'checklistFailuresByProcessAndTurma',
        'boardFailuresByProcessAndTurma',
        'checklistByProcessAndTurmaLastFetchedAt',
        'boardByProcessAndTurmaLastFetchedAt',
        'checklistByProcessAndTurmaDays',
        'boardByProcessAndTurmaDays',
      ],
    },
  },
);
