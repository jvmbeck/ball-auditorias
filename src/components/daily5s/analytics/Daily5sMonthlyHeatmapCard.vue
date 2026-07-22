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
          @click="handleHeatmapClick"
        />

        <Daily5sHeatmapDetailsDialog
          v-model="isDetailsDialogOpen"
          :loading="detailsLoading"
          :error="detailsError"
          :details="selectedDetails"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, provide, ref } from 'vue';
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
import { DAILY5S_PROCESS_ROSTER } from 'src/data/daily5sProcessRoster';
import Daily5sHeatmapDetailsDialog from 'src/components/daily5s/analytics/Daily5sHeatmapDetailsDialog.vue';
import { getLatestDaily5sProcessResultByDate } from 'src/services/audit/auditProcessResults';
import type { Daily5sHeatmapValue, Daily5sTurma } from 'src/types/audit';

interface HeatmapDetailPayload {
  date: string;
  dateLabel: string;
  turma: Daily5sTurma;
  processKey: string;
  processLabel: string;
  rating: Daily5sHeatmapValue;
  reason: string | null;
  auditorComment: string | null;
  imageUrls: string[];
}

interface HeatmapClickParams {
  value?: unknown;
}

use([
  CanvasRenderer,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  DataZoomComponent,
]);
provide(THEME_KEY, 'light');

const analyticsStore = useAnalyticsStore();

const loading = computed(() => analyticsStore.daily5sAnalyticsLoading);
const error = computed(() => analyticsStore.daily5sAnalyticsError);
const heatmapState = computed(() => analyticsStore.daily5sMonthlyHeatmap);

const hasData = computed(
  () =>
    heatmapState.value.processLabels.length > 0 && heatmapState.value.xAxisCategories.length > 0,
);

const isDetailsDialogOpen = ref(false);
const detailsLoading = ref(false);
const detailsError = ref<string | null>(null);
const selectedDetails = ref<HeatmapDetailPayload | null>(null);

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
  const processLabel = heatmapState.value.processLabels[yIndex] ?? '-';
  const processKey = heatmapState.value.processKeys[yIndex];

  if (!category || !processKey) {
    return processLabel;
  }

  const rosterEntry = DAILY5S_PROCESS_ROSTER[processKey] || {
    auditor: 'N/A',
    backup: 'N/A',
    responsible: 'N/A',
  };

  const ratingLabel = rating === 0 ? 'Sem avaliação' : `Nota ${rating}`;

  return `${category.label}<br/>${processLabel}<br/><strong>${ratingLabel}</strong><br/>Auditor: ${rosterEntry.auditor}<br/>Backup: ${rosterEntry.backup}<br/>Responsável: ${rosterEntry.responsible}`;
}

function toValidImageUrls(imageUrls: unknown): string[] {
  if (!Array.isArray(imageUrls)) {
    return [];
  }

  return imageUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
}

function formatGrade1Reason(reasons: unknown, legacyComment: unknown): string | null {
  if (typeof reasons === 'string' && reasons.trim().length > 0) {
    return reasons.trim();
  }

  if (Array.isArray(reasons)) {
    const normalized = reasons.filter(
      (reason): reason is string => typeof reason === 'string' && reason.trim().length > 0,
    );

    if (normalized.length > 0) {
      return normalized.join(', ');
    }
  }

  if (typeof legacyComment === 'string' && legacyComment.trim().length > 0) {
    return legacyComment.trim();
  }

  return null;
}

async function handleHeatmapClick(params: unknown): Promise<void> {
  const payload = (params as HeatmapClickParams | null)?.value;
  const tuple = Array.isArray(payload) ? payload : [];
  const xIndex = typeof tuple[0] === 'number' ? tuple[0] : -1;
  const yIndex = typeof tuple[1] === 'number' ? tuple[1] : -1;
  const rating = typeof tuple[2] === 'number' ? tuple[2] : 0;

  if (rating !== 1 && rating !== 3 && rating !== 5) {
    return;
  }

  const category = heatmapState.value.xAxisCategories[xIndex];
  const processKey = heatmapState.value.processKeys[yIndex];
  const processLabel = heatmapState.value.processLabels[yIndex] ?? '-';

  if (!category || !processKey) {
    return;
  }

  selectedDetails.value = {
    date: category.date,
    dateLabel: category.label,
    turma: category.turma,
    processKey,
    processLabel,
    rating,
    reason: null,
    auditorComment: null,
    imageUrls: [],
  };

  isDetailsDialogOpen.value = true;
  detailsLoading.value = true;
  detailsError.value = null;

  try {
    const result = await getLatestDaily5sProcessResultByDate(category.date, processKey);
    const reason = formatGrade1Reason(result?.grade1Reason, result?.comment);
    const auditorComment = result?.grade1Comment?.trim() || null;

    selectedDetails.value = {
      date: category.date,
      dateLabel: category.label,
      turma: category.turma,
      processKey,
      processLabel,
      rating,
      reason,
      auditorComment,
      imageUrls: toValidImageUrls(result?.imageUrls),
    };
  } catch (err: unknown) {
    detailsError.value =
      err instanceof Error ? err.message : 'Nao foi possivel carregar os detalhes da avaliacao.';
  } finally {
    detailsLoading.value = false;
  }
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
    inverse: true,
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
