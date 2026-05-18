<template>
  <q-card flat bordered class="issue-analytics-card">
    <q-card-section>
      <div class="header q-mb-sm">
        <q-icon name="insights" size="24px" color="primary" class="q-mr-sm" />
        <div>
          <div class="title">Issues do mês</div>
          <div class="subtitle">
            {{ viewMode === 'byTurma' ? 'Por turma' : 'Total geral' }}
          </div>
        </div>
      </div>

      <div>
        <div class="toolbar q-mb-md">
          <div class="toolbar-left">
            <q-btn-toggle
              v-model="viewMode"
              unelevated
              no-caps
              toggle-color="primary"
              color="grey-3"
              text-color="grey-9"
              :options="viewOptions"
              class="view-toggle"
            />

            <q-btn-toggle
              v-model="metricMode"
              unelevated
              no-caps
              toggle-color="primary"
              color="grey-3"
              text-color="grey-9"
              :options="metricOptions"
              class="view-toggle"
            />

            <div class="date-range">
              <q-input
                readonly
                outlined
                dense
                :model-value="rangeDisplay"
                label="Período"
                class="date-range-input"
              >
                <template #prepend>
                  <q-icon name="event" />
                </template>

                <template #append>
                  <q-icon name="arrow_drop_down" />
                </template>

                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                  @before-show="syncDraftRange"
                >
                  <q-date v-model="draftRange" range mask="YYYY-MM-DD" minimal />

                  <div class="date-actions row items-center justify-end q-pa-sm q-gutter-sm">
                    <q-btn flat label="Limpar" color="primary" @click="resetRange" />
                    <q-btn v-close-popup flat label="Aplicar" color="primary" @click="applyRange" />
                    <q-btn v-close-popup flat label="Fechar" color="primary" />
                  </div>
                </q-popup-proxy>
              </q-input>
            </div>
          </div>

          <div class="toolbar-right">
            <template v-if="viewMode === 'byTurma'">
              <q-chip
                v-for="series in turmaSeriesMeta"
                :key="series.key"
                dense
                square
                clickable
                :style="{
                  backgroundColor: activeKeys.has(series.key) ? series.color : '#b0bec5',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }"
                @click="toggleTurma(series.key)"
              >
                {{ series.label }}
              </q-chip>
            </template>

            <q-chip color="primary" text-color="white" icon="report_problem">
              {{ issueAnalytics.byReasonAndTurma.grandTotal }} issues
            </q-chip>
          </div>
        </div>

        <div class="chart-shell">
          <VChart
            autoresize
            :option="chartOption"
            class="chart"
            :class="{ 'chart--hidden': loading || !!error || !hasData }"
          />

          <div v-if="loading" class="state-overlay">
            <q-spinner color="primary" size="28px" />
            <span>Carregando análise de issues...</span>
          </div>

          <div v-else-if="error" class="state-overlay">
            <q-icon name="error" size="20px" color="negative" />
            <span>{{ error }}</span>
          </div>

          <div v-else-if="!hasData" class="state-overlay">
            <q-icon name="event_busy" size="20px" color="grey-7" />
            <span>Sem issues registradas para o período selecionado.</span>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import VChart, { THEME_KEY } from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { fetchDaily5sIssueAnalytics } from 'src/services/audit/analytics.daily5sIssues';
import type { Daily5sIssueAnalyticsData } from 'src/types/audit';
import { toDateKey } from 'src/utils/dateFormatting';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent]);
provide(THEME_KEY, 'light');

const TURMA_SERIES_META = [
  { key: 'AC' as const, label: 'A e C', color: '#1f5d98' },
  { key: 'BD' as const, label: 'B e D', color: '#d64545' },
];

type ViewMode = 'byTurma' | 'overall';
type MetricMode = 'count' | 'percentage';

interface DateRangeModel {
  from: string;
  to?: string;
}

const viewOptions = [
  { label: 'Por turma', value: 'byTurma' },
  { label: 'Total geral', value: 'overall' },
];

const metricOptions = [
  { label: 'Números', value: 'count' },
  { label: 'Percentual', value: 'percentage' },
];

const props = withDefaults(
  defineProps<{
    monthKey: string;
    refreshToken?: number;
  }>(),
  {
    refreshToken: 0,
  },
);

const emit = defineEmits<{
  'update:dateRange': [range: { from: string; to: string }];
}>();

function getMonthKey(monthKey: string): string {
  return /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : toDateKey(new Date()).slice(0, 7);
}

function getMonthRange(monthKey: string): DateRangeModel {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!year || !month) {
    const fallback = toDateKey(new Date()).slice(0, 7);
    return {
      from: `${fallback}-01`,
      to: `${fallback}-28`,
    };
  }

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  return {
    from: toDateKey(firstDay),
    to: toDateKey(lastDay),
  };
}

function toDisplayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) {
    return dateKey;
  }

  return `${day}/${month}/${year}`;
}

function formatRangeDisplay(range: DateRangeModel | null): string {
  if (!range || !range.from) {
    return 'Selecione um período';
  }

  const to = range.to ?? range.from;

  if (range.from === to) {
    return toDisplayDate(range.from);
  }

  return `${toDisplayDate(range.from)} - ${toDisplayDate(to)}`;
}

const baseMonthKey = getMonthKey(props.monthKey);
const baseMonthRange = getMonthRange(baseMonthKey);

const loading = ref(false);
const error = ref<string | null>(null);
const viewMode = ref<ViewMode>('byTurma');
const metricMode = ref<MetricMode>('count');
const appliedRange = ref<DateRangeModel>({ ...baseMonthRange });
const draftRange = ref<DateRangeModel>({ ...baseMonthRange });
const rangeDisplay = computed(() => formatRangeDisplay(appliedRange.value));
const issueAnalytics = ref<Daily5sIssueAnalyticsData>({
  monthKey: '',
  byTurmaTime: { labels: [], buckets: [], series: [], grandTotal: 0 },
  overall: { labels: [], buckets: [], series: [], grandTotal: 0 },
  byReasonAndTurma: { reasons: [], seriesAC: [], seriesBD: [], grandTotal: 0 },
});

const turmaSeriesMeta = TURMA_SERIES_META;

const activeKeys = ref(new Set<'AC' | 'BD'>(['AC', 'BD']));

function toggleTurma(key: 'AC' | 'BD'): void {
  const next = new Set(activeKeys.value);
  if (next.has(key) && next.size > 1) {
    next.delete(key);
  } else {
    next.add(key);
  }
  activeKeys.value = next;
}

function normalizeRange(range: DateRangeModel): DateRangeModel {
  if (!range?.from) {
    return { ...baseMonthRange };
  }

  const from = range.from;
  const to = range.to ?? range.from;

  if (from <= to) {
    return { from, to };
  }

  return { from: to, to: from };
}

function syncDraftRange(): void {
  draftRange.value = { ...appliedRange.value };
}

function applyRange(): void {
  appliedRange.value = normalizeRange(draftRange.value);
  const { from, to } = appliedRange.value;
  emit('update:dateRange', { from, to: to ?? from });
}

function resetRange(): void {
  draftRange.value = { ...baseMonthRange };
}

function toPercentage(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(1));
}

function formatMetricValue(value: number): string {
  if (value <= 0) {
    return '';
  }

  if (metricMode.value === 'percentage') {
    return `${value.toFixed(1)}%`;
  }

  return String(Math.round(value));
}

const hasData = computed(() => issueAnalytics.value.byReasonAndTurma.grandTotal > 0);

const chartOption = computed(() => {
  const { reasons, seriesAC, seriesBD } = issueAnalytics.value.byReasonAndTurma;
  const grandTotal = issueAnalytics.value.byReasonAndTurma.grandTotal;
  const totalAC = seriesAC.reduce((sum, value) => sum + value, 0);
  const totalBD = seriesBD.reduce((sum, value) => sum + value, 0);

  const mappedAC =
    metricMode.value === 'percentage'
      ? seriesAC.map((value) => toPercentage(value, totalAC))
      : seriesAC;
  const mappedBD =
    metricMode.value === 'percentage'
      ? seriesBD.map((value) => toPercentage(value, totalBD))
      : seriesBD;

  if (viewMode.value === 'overall') {
    const totalsCount = reasons.map((_, i) => (seriesAC[i] ?? 0) + (seriesBD[i] ?? 0));
    const totals =
      metricMode.value === 'percentage'
        ? totalsCount.map((value) => toPercentage(value, grandTotal))
        : totalsCount;
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true,
        valueFormatter: (value: number | string) => formatMetricValue(Number(value) || 0),
      },
      legend: { show: false },
      grid: { left: 16, right: 24, top: 18, bottom: 18, containLabel: true },
      xAxis: {
        type: 'category',
        data: reasons,
        axisLabel: {
          color: '#17343d',
          fontSize: 11,
          fontWeight: 600,
          overflow: 'break',
          width: 80,
          interval: 0,
        },
        axisLine: { lineStyle: { color: '#d5dfe4' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: metricMode.value === 'percentage' ? 100 : undefined,
        minInterval: metricMode.value === 'percentage' ? undefined : 1,
        axisLabel: {
          color: '#5f7077',
          fontSize: 11,
          formatter: (value: number) =>
            metricMode.value === 'percentage' ? `${value}%` : String(value),
        },
        splitLine: { lineStyle: { color: '#e1e7ea' } },
      },
      series: [
        {
          name: 'Total',
          type: 'bar',
          barWidth: 45,
          data: totals,
          itemStyle: { color: '#17343d', borderRadius: [6, 6, 0, 0] },
          label: {
            show: true,
            position: 'insideTop',
            color: '#ffffff',
            fontWeight: 700,
            formatter: ({ value }: { value: number }) => formatMetricValue(value),
          },
          emphasis: { focus: 'series' },
        },
      ],
    };
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      valueFormatter: (value: number | string) => formatMetricValue(Number(value) || 0),
    },
    legend: { show: false },
    grid: { left: 16, right: 24, top: 18, bottom: 18, containLabel: true },
    xAxis: {
      type: 'category',
      data: reasons,
      axisLabel: {
        color: '#17343d',
        fontSize: 11,
        fontWeight: 600,
        overflow: 'break',
        width: 80,
        interval: 0,
      },
      axisLine: { lineStyle: { color: '#d5dfe4' } },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: metricMode.value === 'percentage' ? 100 : undefined,
      minInterval: metricMode.value === 'percentage' ? undefined : 1,
      axisLabel: {
        color: '#5f7077',
        fontSize: 11,
        formatter: (value: number) =>
          metricMode.value === 'percentage' ? `${value}%` : String(value),
      },
      splitLine: { lineStyle: { color: '#e1e7ea' } },
    },
    series: [
      ...(activeKeys.value.has('AC')
        ? [
            {
              name: 'A e C',
              type: 'bar',
              barWidth: 45,
              data: mappedAC,
              itemStyle: { color: '#1f5d98', borderRadius: [6, 6, 0, 0] },
              label: {
                show: true,
                position: 'insideTop',
                color: '#ffffff',
                fontWeight: 700,
                formatter: ({ value }: { value: number }) => formatMetricValue(value),
              },
              emphasis: { focus: 'series' },
            },
          ]
        : []),
      ...(activeKeys.value.has('BD')
        ? [
            {
              name: 'B e D',
              type: 'bar',
              barWidth: 45,
              data: mappedBD,
              itemStyle: { color: '#d64545', borderRadius: [6, 6, 0, 0] },
              label: {
                show: true,
                position: 'insideTop',
                color: '#ffffff',
                fontWeight: 700,
                formatter: ({ value }: { value: number }) => formatMetricValue(value),
              },
              emphasis: { focus: 'series' },
            },
          ]
        : []),
    ],
  };
});

async function loadIssueAnalytics(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const effectiveRange = normalizeRange(appliedRange.value);
    const analytics = await fetchDaily5sIssueAnalytics(
      baseMonthKey,
      effectiveRange.from,
      effectiveRange.to,
    );

    issueAnalytics.value = analytics;
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : 'Nao foi possivel carregar as issues do mes.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadIssueAnalytics();
  const { from, to } = appliedRange.value;
  emit('update:dateRange', { from, to: to ?? from });
});

watch(
  () => [appliedRange.value.from, appliedRange.value.to, props.refreshToken],
  () => {
    void loadIssueAnalytics();
  },
);
</script>

<style scoped>
.issue-analytics-card {
  border-radius: 24px;
  background: #ffffff;
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

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.view-toggle {
  min-height: 36px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.date-range-input {
  min-width: 280px;
}

.date-actions {
  min-width: 280px;
  border-top: 1px solid #e1e7ea;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chart-shell {
  position: relative;
  width: 100%;
  height: 320px;
}

.chart {
  width: 100%;
  height: 320px;
}

.chart--hidden {
  visibility: hidden;
}

.state-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #5f7077;
  text-align: center;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 12px;
}

.state-box {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #5f7077;
  text-align: center;
}
</style>
