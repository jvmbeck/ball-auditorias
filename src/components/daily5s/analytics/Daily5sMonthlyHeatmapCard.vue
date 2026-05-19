<template>
  <q-card flat bordered class="daily5s-heatmap-card">
    <q-card-section>
      <div class="header q-mb-sm">
        <q-icon name="grid_view" size="24px" color="primary" class="q-mr-sm" />
        <div>
          <div class="title">Mapa Mensal Daily 5S</div>
          <div class="subtitle">Processos por dia e turma (1, 3, 5)</div>
        </div>
      </div>

      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="28px" />
        <span>Carregando heatmap mensal...</span>
      </div>

      <div v-else-if="error" class="state-box">
        <q-icon name="error" size="20px" color="negative" />
        <span>{{ error }}</span>
      </div>

      <div v-else-if="!hasData" class="state-box">
        <q-icon name="event_busy" size="20px" color="grey-7" />
        <span>Sem dados para o mês selecionado.</span>
      </div>

      <div v-else>
        <div class="legend-row q-mb-md">
          <q-chip dense square color="negative" text-color="white">1</q-chip>
          <q-chip dense square color="warning" text-color="black">3</q-chip>
          <q-chip dense square color="positive" text-color="white">5</q-chip>
          <q-chip dense square color="grey-4" text-color="black">Sem avaliação</q-chip>
        </div>

        <VChart
          autoresize
          :option="chartOption"
          class="chart"
          :style="{ height: `${chartHeight}px` }"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, watch } from 'vue';
import VChart, { THEME_KEY } from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { HeatmapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  DataZoomComponent,
} from 'echarts/components';
import { useAnalyticsStore } from 'src/stores/analytics.store';

use([
  CanvasRenderer,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  DataZoomComponent,
]);
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
const heatmapState = computed(() => analyticsStore.daily5sMonthlyHeatmap);

const hasData = computed(
  () =>
    heatmapState.value.processLabels.length > 0 && heatmapState.value.xAxisCategories.length > 0,
);

const chartHeight = computed(() =>
  Math.max(500, heatmapState.value.processLabels.length * 24 + 180),
);

function formatAxisLabel(categoryKey: string): string {
  const [date, turma] = categoryKey.split('|');
  if (!date || !turma) {
    return categoryKey;
  }

  const [, month, day] = date.split('-');
  const turmaTag = turma === 'A e C' ? '{ac|A/C}' : '{bd|B/D}';
  return `{day|${day}/${month}}\n${turmaTag}`;
}

function tooltipFormatter(params: unknown): string {
  const point = Array.isArray(params) ? params[0] : params;

  if (!point || typeof point !== 'object') {
    return '';
  }

  const values = (point as { value?: unknown }).value;
  const tuple = Array.isArray(values) ? values : [];
  const xIndex = typeof tuple[0] === 'number' ? tuple[0] : -1;
  const yIndex = typeof tuple[1] === 'number' ? tuple[1] : -1;
  const rating = typeof tuple[2] === 'number' ? tuple[2] : 0;

  const category = heatmapState.value.xAxisCategories[xIndex];
  const process = heatmapState.value.processLabels[yIndex] ?? '-';

  if (!category) {
    return process;
  }

  const ratingLabel = rating === 0 ? 'Sem avaliação' : `Nota ${rating}`;

  return `${category.label}<br/>${process}<br/><strong>${ratingLabel}</strong>`;
}

const chartOption = computed(() => ({
  tooltip: {
    position: 'top',
    formatter: tooltipFormatter,
  },
  grid: {
    left: 16,
    right: 18,
    top: 20,
    bottom: 120,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: heatmapState.value.xAxisCategories.map((category) => category.key),
    axisLabel: {
      interval: 0,
      color: '#4d5f66',
      fontSize: 10,
      margin: 12,
      formatter: (value: string) => formatAxisLabel(value),
      rich: {
        day: {
          color: '#3f5158',
          fontWeight: 700,
          lineHeight: 16,
        },
        ac: {
          color: '#ffffff',
          backgroundColor: '#1f5d98',
          borderRadius: 4,
          padding: [2, 5],
          lineHeight: 16,
          fontWeight: 700,
        },
        bd: {
          color: '#ffffff',
          backgroundColor: '#af2a2a',
          borderRadius: 4,
          padding: [2, 5],
          lineHeight: 16,
          fontWeight: 700,
        },
      },
    },
    axisLine: {
      lineStyle: {
        color: '#d5dfe4',
      },
    },
    splitArea: {
      show: true,
      areaStyle: {
        color: ['#fbfcfd', '#f6f9fb'],
      },
    },
  },
  yAxis: {
    type: 'category',
    data: heatmapState.value.processLabels,
    axisLabel: {
      color: '#17343d',
      fontSize: 11,
      fontWeight: 600,
    },
    axisLine: {
      lineStyle: {
        color: '#d5dfe4',
      },
    },
  },
  visualMap: {
    type: 'piecewise',
    orient: 'horizontal',
    left: 'center',
    bottom: 68,
    pieces: [
      { value: 1, label: '1 - Ruim', color: '#d64545' },
      { value: 3, label: '3 - Médio', color: '#f1c453' },
      { value: 5, label: '5 - Excelente', color: '#2e9f5f' },
      { value: 0, label: 'Sem avaliação', color: '#e8eef2' },
    ],
    textStyle: {
      color: '#4d5f66',
      fontSize: 11,
    },
  },
  dataZoom: [
    {
      type: 'inside',
      xAxisIndex: 0,
      zoomLock: false,
      minValueSpan: 10,
    },
    {
      type: 'slider',
      xAxisIndex: 0,
      height: 16,
      bottom: 32,
      borderColor: '#d7e1e6',
      fillerColor: 'rgba(23, 52, 61, 0.18)',
      backgroundColor: '#eef3f6',
      handleStyle: {
        color: '#365965',
      },
    },
  ],
  series: [
    {
      type: 'heatmap',
      data: heatmapState.value.points,
      emphasis: {
        itemStyle: {
          borderColor: '#1f4d5c',
          borderWidth: 1,
          shadowBlur: 8,
          shadowColor: 'rgba(23, 52, 61, 0.35)',
        },
      },
      itemStyle: {
        borderColor: '#d4e0e7',
        borderWidth: 1,
      },
    },
  ],
}));

async function loadHeatmap(force = false): Promise<void> {
  await analyticsStore.loadDaily5sAnalytics(props.monthKey, force);
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
.daily5s-heatmap-card {
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

.state-box {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #5f7077;
  text-align: center;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chart {
  width: 100%;
}
</style>
