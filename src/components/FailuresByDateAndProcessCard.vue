<template>
  <q-card flat bordered class="failures-date-process-card">
    <q-card-section>
      <p class="eyebrow">Tendencia por Processo</p>
      <h2 class="title">Falhas por Data e Processo</h2>
      <p class="subtitle">Ultimos {{ days }} dias</p>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="40px" />
        <p class="state-text">Carregando tendencia por processo...</p>
      </div>

      <div v-else-if="error" class="state-box">
        <q-icon name="error" color="negative" size="28px" />
        <p class="state-text">{{ error }}</p>
      </div>

      <div v-else-if="!hasAnyFailures" class="state-box">
        <q-icon name="insights" color="positive" size="28px" />
        <p class="state-text">Nenhuma falha por processo no periodo selecionado.</p>
      </div>

      <VChart v-else autoresize :option="chartOption" class="chart" />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, provide, watch } from 'vue';
import VChart, { THEME_KEY } from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { useAnalyticsStore } from 'src/stores/analytics.store';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);
provide(THEME_KEY, 'light');

const props = defineProps<{
  days: number;
}>();

const analyticsStore = useAnalyticsStore();
const loading = computed(() => analyticsStore.byDateAndProcessLoading);
const error = computed(() => analyticsStore.byDateAndProcessError);
const chartState = computed(() => analyticsStore.failuresByDateAndProcess);

const hasAnyFailures = computed(() =>
  chartState.value.series.some((seriesItem) => seriesItem.data.some((value) => value > 0)),
);

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
  },
  legend: {
    type: 'scroll',
    top: 0,
    left: 0,
    right: 0,
    textStyle: {
      color: '#5f7077',
      fontSize: 11,
    },
  },
  grid: {
    left: 16,
    right: 20,
    top: 60,
    bottom: 32,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: chartState.value.labels,
    axisLabel: {
      color: '#5f7077',
      fontSize: 10,
    },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: {
      color: '#5f7077',
      fontSize: 11,
    },
    splitLine: {
      lineStyle: {
        color: '#e1e7ea',
      },
    },
  },
  series: chartState.value.series.map((seriesItem) => ({
    name: seriesItem.name,
    type: 'line',
    smooth: true,
    showSymbol: false,
    lineStyle: {
      width: 2,
    },
    emphasis: {
      focus: 'series',
    },
    data: seriesItem.data,
  })),
}));

watch(
  () => props.days,
  async (days) => {
    try {
      await analyticsStore.loadFailuresByDateAndProcess(undefined, false, days);
    } catch {
      // Error state is handled in the store.
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.failures-date-process-card {
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(29, 49, 57, 0.08);
  border: 1px solid rgba(29, 49, 57, 0.12);
}

.eyebrow {
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  color: #6b7f86;
}

.title {
  margin: 0 0 4px;
  font-size: 1.35rem;
  color: #17343d;
}

.subtitle {
  margin: 0;
  font-size: 0.82rem;
  color: #7a9099;
}

.chart {
  height: 360px;
  width: 100%;
}

.state-box {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.state-text {
  margin: 0;
  color: #5f7077;
}
</style>
