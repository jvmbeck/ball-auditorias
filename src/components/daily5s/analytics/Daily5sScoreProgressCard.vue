<template>
  <q-card flat bordered class="score-card">
    <q-card-section>
      <div class="header q-mb-sm">
        <q-icon name="show_chart" size="24px" color="primary" class="q-mr-sm" />
        <div>
          <div class="title">Pontuação auditoria diária de 5S (%)</div>
          <div class="subtitle">{{ subtitle }}</div>
        </div>
      </div>

      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="24px" />
        <span>Carregando pontuações...</span>
      </div>

      <div v-else-if="error" class="state-box">
        <q-icon name="error" size="20px" color="negative" />
        <span>{{ error }}</span>
      </div>

      <div v-else>
        <div class="kpi-row q-mb-sm">
          <q-chip color="primary" text-color="white" icon="query_stats">
            {{ latestPercentage }}% ({{ latestTotal }}/{{ DAILY5S_MAX_SCORE }})
          </q-chip>
          <span class="kpi-hint">Resultado de hoje.</span>
        </div>

        <VChart autoresize :option="chartOption" class="chart" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import VChart, { THEME_KEY } from 'vue-echarts';
import { use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import {
  getTodaysDaily5sRatedProcessKeys,
  subscribeTodaysDaily5sRatedProcessKeys,
} from 'src/services/audit';
import { DAILY5S_MAX_SCORE } from 'src/services/audit/analytics.daily5sCanonical';
import { useAnalyticsStore } from 'src/stores/analytics.store';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);
provide(THEME_KEY, 'light');

const props = withDefaults(
  defineProps<{
    monthKey: string;
    refreshToken?: number;
  }>(),
  {
    refreshToken: 0,
  },
);

const analyticsStore = useAnalyticsStore();
const loading = computed(() => analyticsStore.daily5sAnalyticsLoading);
const error = computed(() => analyticsStore.daily5sAnalyticsError);
const unsubscribeRealtime = ref<(() => void) | null>(null);

const subtitle = computed(() => `Progresso diário do mês sobre ${DAILY5S_MAX_SCORE} pontos`);

function toPercentage(score: number): number {
  return Number(((score / DAILY5S_MAX_SCORE) * 100).toFixed(1));
}

const scoreTrend = computed(() => {
  if (analyticsStore.daily5sMonthlyScoreTrendByTurma.monthKey !== props.monthKey) {
    return {
      labels: [],
      percentages: [],
      totals: [],
      percentagesByDate: {},
      totalsByDate: {},
    };
  }

  const acTrend = analyticsStore.daily5sMonthlyScoreTrendByTurma.ac;
  const bdTrend = analyticsStore.daily5sMonthlyScoreTrendByTurma.bd;
  const labels = acTrend.labels.length ? acTrend.labels : bdTrend.labels;

  const totals = labels.map(
    (_, index) => (acTrend.totals[index] ?? 0) + (bdTrend.totals[index] ?? 0),
  );
  const percentages = totals.map((score) => toPercentage(score));
  const totalsByDate = Object.fromEntries(labels.map((date, index) => [date, totals[index] ?? 0]));
  const percentagesByDate = Object.fromEntries(
    labels.map((date, index) => [date, percentages[index] ?? 0]),
  );

  return {
    labels,
    percentages,
    totals,
    percentagesByDate,
    totalsByDate,
  };
});

function getTodayDateKey(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const latestScoreIndex = computed(() => {
  const labels = scoreTrend.value.labels;
  const totals = scoreTrend.value.totals;

  if (!labels.length || !totals.length) {
    return -1;
  }

  const todayIndex = labels.indexOf(getTodayDateKey());
  if (todayIndex >= 0 && (totals[todayIndex] ?? 0) > 0) {
    return todayIndex;
  }

  for (let index = totals.length - 1; index >= 0; index -= 1) {
    if ((totals[index] ?? 0) > 0) {
      return index;
    }
  }

  return -1;
});

const latestTotal = computed(() => {
  if (latestScoreIndex.value < 0) {
    return 0;
  }

  return scoreTrend.value.totals[latestScoreIndex.value] ?? 0;
});

const latestPercentage = computed(() => {
  if (latestScoreIndex.value < 0) {
    return 0;
  }

  return scoreTrend.value.percentages[latestScoreIndex.value] ?? 0;
});

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) {
    return dateKey;
  }

  return `${day}/${month}`;
}

function formatTooltipValue(value: unknown): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return '0%';
  }

  return `${numeric}%`;
}

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: unknown) => formatTooltipValue(value),
  },
  grid: {
    left: 16,
    right: 16,
    top: 16,
    bottom: 30,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: scoreTrend.value.labels.map((label) => formatDateLabel(label)),
    axisLabel: {
      color: '#5f7077',
      fontSize: 11,
    },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: {
      color: '#5f7077',
      fontSize: 11,
      formatter: '{value}%',
    },
    splitLine: {
      lineStyle: {
        color: '#e1e7ea',
      },
    },
  },
  series: [
    {
      name: 'Pontuação',
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbolSize: 7,
      itemStyle: {
        color: '#129e7b',
      },
      lineStyle: {
        width: 3,
        color: '#129e7b',
      },
      areaStyle: {
        color: 'rgba(18, 158, 123, 0.12)',
      },
      data: scoreTrend.value.percentages,
    },
  ],
}));

async function loadScoreTrend(): Promise<void> {
  if (!props.monthKey) {
    return;
  }

  try {
    await analyticsStore.loadDaily5sAnalytics(props.monthKey, false);
  } catch {
    // Shared error state is managed by the analytics store.
  }
}

async function refreshScoreTrend(): Promise<void> {
  if (!props.monthKey) {
    return;
  }

  try {
    await analyticsStore.loadDaily5sAnalytics(props.monthKey, true);
  } catch {
    // Shared error state is managed by the analytics store.
  }
}

async function subscribeRealtimeRefresh(): Promise<void> {
  if (unsubscribeRealtime.value) {
    unsubscribeRealtime.value();
    unsubscribeRealtime.value = null;
  }

  try {
    await getTodaysDaily5sRatedProcessKeys();
    unsubscribeRealtime.value = subscribeTodaysDaily5sRatedProcessKeys(
      () => {
        void refreshScoreTrend();
      },
      () => {
        // Shared error state is managed by the analytics store.
      },
    );
  } catch {
    // Shared error state is managed by the analytics store.
  }
}

onMounted(() => {
  void loadScoreTrend();
  void subscribeRealtimeRefresh();
});

onBeforeUnmount(() => {
  if (unsubscribeRealtime.value) {
    unsubscribeRealtime.value();
    unsubscribeRealtime.value = null;
  }
});

watch(
  () => props.monthKey,
  () => {
    void loadScoreTrend();
  },
);

watch(
  () => props.refreshToken,
  () => {
    void refreshScoreTrend();
  },
);
</script>

<style scoped>
.score-card {
  border-radius: 24px;
  background: white;
  box-shadow: 0 18px 48px rgba(29, 49, 57, 0.08);
}

.header {
  display: flex;
  align-items: center;
}

.title {
  font-size: 1rem;
  font-weight: 700;
  color: #17343d;
}

.subtitle {
  color: #5f7077;
  font-size: 0.85rem;
}

.kpi-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.kpi-hint {
  color: #5f7077;
  font-size: 0.82rem;
}

.chart {
  height: 250px;
  width: 100%;
}

.state-box {
  min-height: 86px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #5f7077;
  text-align: center;
}
</style>
