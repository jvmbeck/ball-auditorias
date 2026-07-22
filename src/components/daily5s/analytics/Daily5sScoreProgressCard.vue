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
        <div class="legend-filter q-mb-sm">
          <span class="legend-label">Visualização:</span>
          <div class="legend-pills">
            <q-btn
              v-for="pill in turmaLegendPills"
              :key="pill.value"
              no-caps
              unelevated
              rounded
              :class="['legend-pill', { 'legend-pill--active': selectedTurmaView === pill.value }]"
              @click="selectedTurmaView = pill.value"
            >
              <span class="pill-dot" :style="{ backgroundColor: pill.color }" />
              <span>{{ pill.label }}</span>
            </q-btn>
          </div>
        </div>

        <div class="kpi-row q-mb-sm">
          <q-chip color="primary" text-color="white" icon="query_stats">
            {{ todayPercentage }}% ({{ todayTotal }}/{{ DAILY5S_MAX_SCORE }})
          </q-chip>
          <span class="kpi-hint">{{ kpiHint }}</span>
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
const selectedTurmaView = ref<'combined' | 'ac' | 'bd'>('combined');

const turmaLegendPills: Array<{
  label: string;
  value: 'combined' | 'ac' | 'bd';
  color: string;
}> = [
  { label: 'A e C + B e D', value: 'combined', color: '#129e7b' },
  { label: 'A e C', value: 'ac', color: '#1f7ae0' },
  { label: 'B e D', value: 'bd', color: '#f28e2b' },
];

const subtitle = computed(() => `Progresso diário do mês sobre ${DAILY5S_MAX_SCORE} pontos`);

function toPercentage(score: number): number {
  return Number(((score / DAILY5S_MAX_SCORE) * 100).toFixed(1));
}

function buildTotalsByDate(
  labels: string[],
  totals: number[],
): {
  totalsByDate: Record<string, number>;
  percentagesByDate: Record<string, number>;
  percentages: number[];
} {
  const percentages = totals.map((score) => toPercentage(score));
  const totalsByDate = Object.fromEntries(labels.map((date, index) => [date, totals[index] ?? 0]));
  const percentagesByDate = Object.fromEntries(
    labels.map((date, index) => [date, percentages[index] ?? 0]),
  );

  return {
    totalsByDate,
    percentagesByDate,
    percentages,
  };
}

const scoreTrend = computed(() => {
  if (analyticsStore.daily5sMonthlyScoreTrendByTurma.monthKey !== props.monthKey) {
    return {
      labels: [],
      combined: {
        totals: [],
        percentages: [],
        percentagesByDate: {},
        totalsByDate: {},
      },
      ac: {
        totals: [],
        percentages: [],
        percentagesByDate: {},
        totalsByDate: {},
      },
      bd: {
        totals: [],
        percentages: [],
        percentagesByDate: {},
        totalsByDate: {},
      },
    };
  }

  const acTrend = analyticsStore.daily5sMonthlyScoreTrendByTurma.ac;
  const bdTrend = analyticsStore.daily5sMonthlyScoreTrendByTurma.bd;
  const labels = Array.from(new Set([...acTrend.labels, ...bdTrend.labels])).sort();

  const acTotalsByDate = Object.fromEntries(
    acTrend.labels.map((date, index) => [date, acTrend.totals[index] ?? 0]),
  );
  const bdTotalsByDate = Object.fromEntries(
    bdTrend.labels.map((date, index) => [date, bdTrend.totals[index] ?? 0]),
  );

  const acTotals = labels.map((date) => acTotalsByDate[date] ?? 0);
  const bdTotals = labels.map((date) => bdTotalsByDate[date] ?? 0);
  const combinedTotals = labels.map((_, index) => (acTotals[index] ?? 0) + (bdTotals[index] ?? 0));

  const ac = buildTotalsByDate(labels, acTotals);
  const bd = buildTotalsByDate(labels, bdTotals);
  const combined = buildTotalsByDate(labels, combinedTotals);

  return {
    labels,
    combined: {
      totals: combinedTotals,
      percentages: combined.percentages,
      percentagesByDate: combined.percentagesByDate,
      totalsByDate: combined.totalsByDate,
    },
    ac: {
      totals: acTotals,
      percentages: ac.percentages,
      percentagesByDate: ac.percentagesByDate,
      totalsByDate: ac.totalsByDate,
    },
    bd: {
      totals: bdTotals,
      percentages: bd.percentages,
      percentagesByDate: bd.percentagesByDate,
      totalsByDate: bd.totalsByDate,
    },
  };
});

const selectedTrend = computed(() => {
  if (selectedTurmaView.value === 'ac') {
    return scoreTrend.value.ac;
  }

  if (selectedTurmaView.value === 'bd') {
    return scoreTrend.value.bd;
  }

  return {
    totals: scoreTrend.value.combined.totals,
    percentages: scoreTrend.value.combined.percentages,
    percentagesByDate: scoreTrend.value.combined.percentagesByDate,
    totalsByDate: scoreTrend.value.combined.totalsByDate,
  };
});

const selectedSeriesName = computed(() => {
  if (selectedTurmaView.value === 'ac') {
    return 'Pontuação A e C';
  }

  if (selectedTurmaView.value === 'bd') {
    return 'Pontuação B e D';
  }

  return 'Pontuação A e C + B e D';
});

const selectedSeriesColor = computed(() => {
  if (selectedTurmaView.value === 'ac') {
    return '#1f7ae0';
  }

  if (selectedTurmaView.value === 'bd') {
    return '#f28e2b';
  }

  return '#129e7b';
});

function getTodayDateKey(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const todayDateKey = computed(() => getTodayDateKey());

const latestScoreIndex = computed(() => {
  const labels = scoreTrend.value.labels;
  const totals = selectedTrend.value.totals;

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

const todayTotal = computed(() => selectedTrend.value.totalsByDate[todayDateKey.value] ?? 0);

const todayPercentage = computed(() => toPercentage(todayTotal.value));

const kpiHint = computed(() => {
  if (todayTotal.value > 0) {
    return 'Resultado de hoje.';
  }

  if (latestScoreIndex.value >= 0) {
    const latestDate = scoreTrend.value.labels[latestScoreIndex.value] ?? '';
    return latestDate
      ? `Sem resultado hoje. Último registro em ${formatDateLabel(latestDate)}.`
      : 'Sem resultado hoje.';
  }

  return 'Sem resultado hoje.';
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
      name: selectedSeriesName.value,
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbolSize: 7,
      itemStyle: {
        color: selectedSeriesColor.value,
      },
      lineStyle: {
        width: 3,
        color: selectedSeriesColor.value,
      },
      areaStyle: {
        color:
          selectedTurmaView.value === 'ac'
            ? 'rgba(31, 122, 224, 0.12)'
            : selectedTurmaView.value === 'bd'
              ? 'rgba(242, 142, 43, 0.12)'
              : 'rgba(18, 158, 123, 0.12)',
      },
      data: selectedTrend.value.percentages,
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

.legend-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.legend-label {
  color: #5f7077;
  font-size: 0.82rem;
  font-weight: 600;
}

.legend-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.legend-pill {
  border: 1px solid #c5d2d8;
  color: #4e6570;
  background: #ffffff;
  font-weight: 600;
  min-height: 15px;
  padding: 0 10px;
}

.legend-pill--active {
  border-color: #8eb9ad;
  color: #17343d;
  background: #edf7f3;
}

.pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.legend-pill :deep(.q-btn__content) {
  gap: 7px;
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
