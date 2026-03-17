import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  fetchFailuresByProcess,
  fetchFailuresOverTime,
  fetchProcessFailureRates,
} from 'src/services/audit';
import type {
  FailuresByProcessData,
  FailuresOverTimeData,
  ProcessFailureRatesData,
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

function isStale(lastFetchedAt: number | null): boolean {
  if (!lastFetchedAt) {
    return true;
  }

  return Date.now() - lastFetchedAt > CACHE_MAX_AGE_MS;
}

export const useAnalyticsStore = defineStore(
  'analytics',
  () => {
    const failuresOverTime = ref<FailuresOverTimeData>(EMPTY_FAILURES_OVER_TIME);
    const failuresByProcess = ref<FailuresByProcessData>(EMPTY_FAILURES_BY_PROCESS);
    const processFailureRates = ref<ProcessFailureRatesData>(EMPTY_PROCESS_FAILURE_RATES);

    const overTimeLoading = ref(false);
    const byProcessLoading = ref(false);
    const processFailureRateLoading = ref(false);

    const overTimeError = ref<string | null>(null);
    const byProcessError = ref<string | null>(null);
    const processFailureRateError = ref<string | null>(null);

    const overTimeLastFetchedAt = ref<number | null>(null);
    const byProcessLastFetchedAt = ref<number | null>(null);
    const processFailureRateLastFetchedAt = ref<number | null>(null);

    let overTimeRequest: Promise<void> | null = null;
    let byProcessRequest: Promise<void> | null = null;
    let processFailureRateRequest: Promise<void> | null = null;

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

    async function refreshAllAnalytics(): Promise<void> {
      await Promise.all([
        loadFailuresOverTime(true),
        loadFailuresByProcess(true),
        loadProcessFailureRates(true),
      ]);
    }

    return {
      failuresOverTime,
      failuresByProcess,
      processFailureRates,
      overTimeLoading,
      byProcessLoading,
      processFailureRateLoading,
      overTimeError,
      byProcessError,
      processFailureRateError,
      overTimeLastFetchedAt,
      byProcessLastFetchedAt,
      processFailureRateLastFetchedAt,
      loadFailuresOverTime,
      loadFailuresByProcess,
      loadProcessFailureRates,
      refreshAllAnalytics,
    };
  },
  {
    persist: {
      key: 'analytics-dashboard-cache-v1',
      pick: [
        'failuresOverTime',
        'failuresByProcess',
        'processFailureRates',
        'overTimeLastFetchedAt',
        'byProcessLastFetchedAt',
        'processFailureRateLastFetchedAt',
      ],
    },
  },
);
