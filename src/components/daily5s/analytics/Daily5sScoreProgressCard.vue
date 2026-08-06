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

        <div class="score-kpis">
          <q-chip color="primary" text-color="white" icon="today" class="score-chip">
            <div class="score-chip__content">
              <span class="score-chip__label">Hoje</span>

              <strong class="score-chip__value">
                {{ todayPercentageLabel }} - {{ todayTotal }}/{{ DAILY5S_MAX_SCORE }}
              </strong>
            </div>

            <q-tooltip>
              {{ kpiHint }}
            </q-tooltip>
          </q-chip>

          <q-chip color="secondary" text-color="white" icon="calendar_month" class="score-chip">
            <div class="score-chip__content">
              <span class="score-chip__label">Média mensal</span>

              <strong class="score-chip__value">
                {{ monthlyPercentageLabel }} - {{ monthlyAverageTotal }}/{{ DAILY5S_MAX_SCORE }}
              </strong>
            </div>

            <q-tooltip>
              {{ monthlyKpiHint }}
            </q-tooltip>
          </q-chip>
        </div>

        <VChart autoresize :option="chartOption" class="chart" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import VChart, { THEME_KEY } from 'vue-echarts';
import { use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { DAILY5S_MAX_SCORE } from 'src/services/daily5s/analytics.daily5sCanonical';
import { useAnalyticsStore } from 'src/stores/analytics.store';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, MarkLineComponent]);
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
const selectedTurmaView = ref<'combined' | 'ac' | 'bd'>('combined');

const turmaLegendPills: Array<{
  label: string;
  value: 'combined' | 'ac' | 'bd';
  color: string;
}> = [
  { label: 'A e C + B e D', value: 'combined', color: '#129e7b' },
  { label: 'A e C', value: 'ac', color: '#1f7ae0' },
  { label: 'B e D', value: 'bd', color: '#d64545' },
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
    return '#d64545';
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
const recordedMonthlyTotals = computed(() =>
  selectedTrend.value.totals.filter((total) => total > 0),
);

const monthlyAverageTotal = computed(() => {
  const totals = recordedMonthlyTotals.value;

  if (!totals.length) {
    return 0;
  }

  const sum = totals.reduce((accumulator, total) => accumulator + total, 0);

  return Number((sum / totals.length).toFixed(1));
});

const monthlyPercentage = computed(() =>
  Number(toPercentage(monthlyAverageTotal.value).toFixed(1)),
);

const monthlyAuditCount = computed(() => recordedMonthlyTotals.value.length);

const monthlyKpiHint = computed(() => {
  if (!monthlyAuditCount.value) {
    return 'Nenhum resultado registrado neste mês.';
  }

  const auditLabel = monthlyAuditCount.value === 1 ? 'auditoria' : 'auditorias';

  return `Média de ${monthlyAuditCount.value} ${auditLabel} no mês.`;
});

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

const hasTodayResult = computed(() => todayTotal.value > 0);

const todayPercentageLabel = computed(() =>
  hasTodayResult.value ? `${todayPercentage.value}%` : '—',
);

const monthlyPercentageLabel = computed(() =>
  monthlyAuditCount.value ? `${monthlyPercentage.value}%` : '—',
);

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) {
    return dateKey;
  }

  return `${day}/${month}`;
}

// Constants for goal and challenge percentages shown in the chart as dashed lines.
const GOAL_PERCENTAGE = 75;
const CHALLENGE_PERCENTAGE = 90;

interface MarkLineData {
  name: string;
  yAxis: number;
}

interface TooltipPoint {
  axisValue: string;
  dataIndex: number;
  marker: string;
  seriesName: string;
  value: number;
}

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: TooltipPoint[]) => {
      const point = params[0];

      if (!point) return '';

      const total = selectedTrend.value.totals[point.dataIndex] ?? 0;

      return `
    ${point.axisValue} - Pontuação<br/>
    Porcentagem: <b>${point.value}%</b><br/>
    Soma: <b>${total}/${DAILY5S_MAX_SCORE}</b>
  `;
    },
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
      markLine: {
        silent: true,
        symbol: 'none',

        label: {
          show: true,
          position: 'insideStart',
          formatter: (params: { data: MarkLineData }) =>
            `${params.data.name}: ${params.data.yAxis}%`,
          padding: [0, 6],
          color: '#555',
          backgroundColor: '#fff',
        },

        data: [
          {
            name: 'Meta',
            yAxis: GOAL_PERCENTAGE,
            lineStyle: {
              type: 'dashed',
              color: '#1976d2',
              width: 2,
            },
          },
          {
            name: 'Desafio',
            yAxis: CHALLENGE_PERCENTAGE,
            lineStyle: {
              type: 'solid',
              color: '#9c27b0',
              width: 2,
            },
          },
        ],
      },
      data: selectedTrend.value.percentages,
    },
  ],
}));

async function loadScoreTrend(forceRefresh = false): Promise<void> {
  if (!props.monthKey) {
    return;
  }

  try {
    await analyticsStore.loadDaily5sAnalytics(props.monthKey, forceRefresh);
  } catch {
    // Shared error state is managed by the analytics store.
  }
}

onMounted(() => {
  void loadScoreTrend();
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
    void loadScoreTrend(true);
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

.score-kpis {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex-wrap: wrap;
}

.score-chip {
  height: auto;
  min-height: 44px;
  margin: 0;
  padding: 6px 12px;
  border-radius: 12px;
}

.score-chip__content {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.score-chip__label {
  font-size: 0.72rem;
  font-weight: 500;
  opacity: 0.88;
}

.score-chip__value {
  margin-top: 2px;
  font-size: 1rem;
  font-weight: 700;
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
