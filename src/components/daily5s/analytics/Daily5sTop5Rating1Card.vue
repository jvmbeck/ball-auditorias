<template>
  <q-card flat bordered class="rating1-card">
    <q-card-section>
      <div class="header q-mb-sm">
        <q-icon name="warning_amber" size="24px" color="negative" class="q-mr-sm" />
        <div>
          <div class="title">Top 5 processos com nota 1</div>
          <div class="subtitle">Processos com maior frequência de nota 1 no período</div>
        </div>
        <q-chip color="negative" text-color="white" icon="low_priority" class="q-ml-auto">
          {{ rating1Data.total }} ocorrências
        </q-chip>
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
          <span>Carregando processos com nota 1...</span>
        </div>

        <div v-else-if="error" class="state-overlay">
          <q-icon name="error" size="20px" color="negative" />
          <span>{{ error }}</span>
        </div>

        <div v-else-if="!hasData" class="state-overlay">
          <q-icon name="check_circle" size="20px" color="positive" />
          <span>Nenhum processo com nota 1 no período selecionado.</span>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, watch } from 'vue';
import VChart, { THEME_KEY } from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { useAnalyticsStore } from 'src/stores/analytics.store';
import type { Daily5sHeatmapPoint, Daily5sRating1ByProcessData } from 'src/types/audit';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);
provide(THEME_KEY, 'light');

const props = withDefaults(
  defineProps<{
    monthKey: string;
    startDateKey?: string;
    endDateKey?: string;
    refreshToken?: number;
  }>(),
  {
    refreshToken: 0,
  },
);

const TOP_N = 5;
const analyticsStore = useAnalyticsStore();

function toMonthBounds(monthKey: string): { from: string; to: string } {
  const valid = /^\d{4}-\d{2}$/.test(monthKey);
  const base = valid ? `${monthKey}-01` : new Date().toISOString().slice(0, 7) + '-01';
  const monthDate = new Date(`${base}T00:00:00`);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  const from = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(monthStart.getDate()).padStart(2, '0')}`;
  const to = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

  return { from, to };
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getEffectiveRange(): { from: string; to: string } {
  const fallback = toMonthBounds(props.monthKey);
  let from = isDateKey(props.startDateKey) ? props.startDateKey : fallback.from;
  let to = isDateKey(props.endDateKey) ? props.endDateKey : fallback.to;

  if (from > to) {
    [from, to] = [to, from];
  }

  return { from, to };
}

const loading = computed(() => analyticsStore.daily5sMonthlyHeatmapLoading);
const error = computed(() => analyticsStore.daily5sMonthlyHeatmapError);
const heatmapState = computed(() => analyticsStore.daily5sMonthlyHeatmap);

const rating1Data = computed<Daily5sRating1ByProcessData>(() => {
  if (heatmapState.value.monthKey !== props.monthKey) {
    return { labels: [], data: [], total: 0 };
  }

  const { from, to } = getEffectiveRange();
  const countByProcess = new Map<string, number>();

  heatmapState.value.points.forEach((point: Daily5sHeatmapPoint) => {
    const [xIndex, yIndex, rating] = point;
    if (rating !== 1) {
      return;
    }

    const category = heatmapState.value.xAxisCategories[xIndex];
    const processLabel = heatmapState.value.processLabels[yIndex];

    if (!category || !processLabel || category.date < from || category.date > to) {
      return;
    }

    countByProcess.set(processLabel, (countByProcess.get(processLabel) ?? 0) + 1);
  });

  const sorted = [...countByProcess.entries()].sort(([, a], [, b]) => b - a).slice(0, TOP_N);
  const labels = sorted.map(([label]) => label);
  const data = sorted.map(([, count]) => count);

  return {
    labels,
    data,
    total: data.reduce((sum, value) => sum + value, 0),
  };
});

const BAR_COLORS = ['#d64545', '#f1853d', '#1f5d98', '#2e9f5f', '#8b5cf6'];

const hasData = computed(() => rating1Data.value.total > 0);

const chartOption = computed(() => {
  // Reverse so highest bar is at the top of the horizontal chart
  const labels = [...rating1Data.value.labels].reverse();
  const data = [...rating1Data.value.data].reverse();

  const coloredData = data.map((value, index) => ({
    value,
    itemStyle: {
      color: BAR_COLORS[index % BAR_COLORS.length],
      borderRadius: [0, 6, 6, 0],
    },
  }));

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params: { name: string; value: number }[]) => {
        const item = params[0];
        if (!item) return '';
        return `<strong>${item.name}</strong><br/>Nota 1: <strong>${item.value}</strong>`;
      },
    },
    grid: { left: 16, right: 48, top: 12, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        color: '#5f7077',
        fontSize: 11,
        formatter: (value: number) => String(value),
      },
      splitLine: { lineStyle: { color: '#e1e7ea' } },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        color: '#17343d',
        fontSize: 13,
        fontWeight: 700,
        overflow: 'truncate',
        width: 220,
      },
      axisLine: { lineStyle: { color: '#d5dfe4' } },
    },
    series: [
      {
        type: 'bar',
        data: coloredData,
        label: {
          show: true,
          position: 'right',
          color: '#17343d',
          fontWeight: 700,
          formatter: ({ value }: { value: number }) => (value > 0 ? String(value) : ''),
        },
        emphasis: { focus: 'series' },
      },
    ],
  };
});

async function loadHeatmap(force = false): Promise<void> {
  await analyticsStore.loadDaily5sMonthlyHeatmap(props.monthKey, force);
}

onMounted(() => {
  void loadHeatmap(false);
});

watch(
  () => props.monthKey,
  () => {
    void loadHeatmap(false);
  },
);

watch(
  () => props.refreshToken,
  () => {
    void loadHeatmap(true);
  },
);
</script>

<style scoped>
.rating1-card {
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

.chart-shell {
  position: relative;
  width: 100%;
  height: 280px;
}

.chart {
  width: 100%;
  height: 280px;
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
</style>
