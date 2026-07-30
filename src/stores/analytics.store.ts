import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  deriveDaily5sActionPlan,
  deriveDaily5sIssueAnalytics,
  deriveDaily5sMonthlyHeatmap,
  deriveDaily5sMonthlyScoreTrend,
  deriveDaily5sTopRating1ByProcess,
  fetchDaily5sAggregatedMonthlyData,
  fetchDaily5sCanonicalMonthlyData,
} from 'src/services/daily5s';
import type {
  Daily5sActionPlanData,
  Daily5sCanonicalMonthlyData,
  Daily5sIssueAnalyticsData,
  Daily5sMonthlyHeatmapData,
  Daily5sMonthlyScoreTrendByTurmaData,
  Daily5sRating1ByProcessData,
  Daily5sScoreTrendData,
} from 'src/types/audit';

const CACHE_MAX_AGE_MS = 15 * 60 * 1000;

const EMPTY_DAILY5S_MONTHLY_HEATMAP: Daily5sMonthlyHeatmapData = {
  monthKey: '',
  processLabels: [],
  processKeys: [],
  xAxisCategories: [],
  points: [],
};

const EMPTY_DAILY5S_SCORE_TREND: Daily5sScoreTrendData = {
  labels: [],
  percentages: [],
  totals: [],
  percentagesByDate: {},
  totalsByDate: {},
};

const EMPTY_DAILY5S_SCORE_TRENDS_BY_TURMA: Daily5sMonthlyScoreTrendByTurmaData = {
  monthKey: '',
  ac: EMPTY_DAILY5S_SCORE_TREND,
  bd: EMPTY_DAILY5S_SCORE_TREND,
};

const EMPTY_DAILY5S_CANONICAL: Daily5sCanonicalMonthlyData = {
  monthKey: '',
  startKey: '',
  endKey: '',
  rows: [],
};

function isStale(lastFetchedAt: number | null): boolean {
  if (!lastFetchedAt) {
    return true;
  }

  return Date.now() - lastFetchedAt > CACHE_MAX_AGE_MS;
}

export const useAnalyticsStore = defineStore('analytics', () => {
  // ── Core dashboard state ───────────────────────────────────────────────────

  const daily5sCanonical = ref<Daily5sCanonicalMonthlyData>(EMPTY_DAILY5S_CANONICAL);
  const daily5sGradesCanonical = ref<Daily5sCanonicalMonthlyData>(EMPTY_DAILY5S_CANONICAL);
  const daily5sMonthlyHeatmap = ref<Daily5sMonthlyHeatmapData>(EMPTY_DAILY5S_MONTHLY_HEATMAP);
  const daily5sMonthlyScoreTrendByTurma = ref<Daily5sMonthlyScoreTrendByTurmaData>(
    EMPTY_DAILY5S_SCORE_TRENDS_BY_TURMA,
  );

  const overTimeLoading = ref(false);
  const byProcessLoading = ref(false);
  const processFailureRateLoading = ref(false);
  const daily5sAnalyticsLoading = ref(false);

  const daily5sAnalyticsError = ref<string | null>(null);

  const overTimeLastFetchedAt = ref<number | null>(null);
  const byProcessLastFetchedAt = ref<number | null>(null);
  const processFailureRateLastFetchedAt = ref<number | null>(null);
  const daily5sAnalyticsLastFetchedAt = ref<number | null>(null);
  const daily5sMonthlyHeatmapMonth = ref<string | null>(null);

  // Request deduplication
  let daily5sAnalyticsRequest: Promise<void> | null = null;

  function getDaily5sIssueAnalyticsByRange(
    startDateKey?: string,
    endDateKey?: string,
  ): Daily5sIssueAnalyticsData {
    if (!daily5sCanonical.value.monthKey) {
      return deriveDaily5sIssueAnalytics(EMPTY_DAILY5S_CANONICAL);
    }
    return deriveDaily5sIssueAnalytics(daily5sCanonical.value, startDateKey, endDateKey);
  }

  function getDaily5sTopRating1ByProcess(
    startDateKey?: string,
    endDateKey?: string,
    topN = 5,
  ): Daily5sRating1ByProcessData {
    if (!daily5sGradesCanonical.value.monthKey) {
      return { labels: [], data: [], total: 0 };
    }

    return deriveDaily5sTopRating1ByProcess(
      daily5sGradesCanonical.value,
      startDateKey,
      endDateKey,
      topN,
    );
  }

  function getDaily5sActionPlanByRange(
    startDateKey?: string,
    endDateKey?: string,
  ): Daily5sActionPlanData {
    if (!daily5sCanonical.value.monthKey) {
      return { rows: [], total: 0 };
    }

    return deriveDaily5sActionPlan(daily5sCanonical.value, startDateKey, endDateKey);
  }

  async function loadDaily5sAnalytics(monthKey: string, force = false): Promise<void> {
    const hasCompleteCurrentData =
      daily5sCanonical.value.monthKey === monthKey &&
      daily5sGradesCanonical.value.monthKey === monthKey &&
      daily5sCanonical.value.rows.length > 0 &&
      daily5sGradesCanonical.value.rows.length > 0;

    if (!force && hasCompleteCurrentData && !isStale(daily5sAnalyticsLastFetchedAt.value)) {
      return;
    }

    if (daily5sAnalyticsRequest) {
      return daily5sAnalyticsRequest;
    }

    daily5sAnalyticsRequest = (async () => {
      daily5sAnalyticsLoading.value = true;
      daily5sAnalyticsError.value = null;

      try {
        const [gradesCanonical, detailsCanonical] = await Promise.all([
          fetchDaily5sAggregatedMonthlyData(monthKey),
          fetchDaily5sCanonicalMonthlyData(monthKey),
        ]);

        daily5sCanonical.value = detailsCanonical;
        daily5sGradesCanonical.value = gradesCanonical;

        daily5sMonthlyHeatmap.value = deriveDaily5sMonthlyHeatmap(gradesCanonical);

        daily5sMonthlyScoreTrendByTurma.value = {
          monthKey: gradesCanonical.monthKey,
          ac: deriveDaily5sMonthlyScoreTrend(gradesCanonical, 'A e C'),
          bd: deriveDaily5sMonthlyScoreTrend(gradesCanonical, 'B e D'),
        };

        daily5sMonthlyHeatmapMonth.value = gradesCanonical.monthKey;
        daily5sAnalyticsLastFetchedAt.value = Date.now();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Unable to load Daily 5S analytics data.';

        daily5sAnalyticsError.value = message;
        throw err;
      } finally {
        daily5sAnalyticsLoading.value = false;
        daily5sAnalyticsRequest = null;
      }
    })();

    return daily5sAnalyticsRequest;
  }
  async function refreshDaily5sAnalytics(monthKey: string): Promise<void> {
    await loadDaily5sAnalytics(monthKey, true);
  }

  return {
    // Core dashboard + Daily5S canonical
    daily5sCanonical,
    daily5sGradesCanonical,
    daily5sMonthlyHeatmap,
    daily5sMonthlyScoreTrendByTurma,
    overTimeLoading,
    byProcessLoading,
    processFailureRateLoading,
    daily5sAnalyticsLoading,

    daily5sAnalyticsError,
    overTimeLastFetchedAt,
    byProcessLastFetchedAt,
    processFailureRateLastFetchedAt,
    daily5sAnalyticsLastFetchedAt,
    daily5sMonthlyHeatmapMonth,

    loadDaily5sAnalytics,
    refreshDaily5sAnalytics,
    getDaily5sIssueAnalyticsByRange,
    getDaily5sTopRating1ByProcess,
    getDaily5sActionPlanByRange,
  };
});
