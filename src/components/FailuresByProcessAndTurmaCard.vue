<template>
  <q-card flat bordered class="failures-turma-card">
    <q-card-section>
      <p class="eyebrow">Insight Prioritário</p>
      <h2 class="title">Falhas por Processo e Turma</h2>
      <p class="subtitle">{{ subtitle }}</p>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="40px" />
        <p class="state-text">Carregando dados por turma...</p>
      </div>

      <div v-else-if="error" class="state-box">
        <q-icon name="error" color="negative" size="28px" />
        <p class="state-text">{{ error }}</p>
      </div>

      <div v-else-if="!chartState.labels.length" class="state-box">
        <q-icon name="check_circle" color="positive" size="28px" />
        <p class="state-text">Nenhuma falha de processo no período selecionado.</p>
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
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { useAnalyticsStore } from 'src/stores/analytics.store';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent]);
provide(THEME_KEY, 'light');

const props = defineProps<{
  days: number;
}>();

const analyticsStore = useAnalyticsStore();
const loading = computed(() => analyticsStore.byProcessAndTurmaLoading);
const error = computed(() => analyticsStore.byProcessAndTurmaError);
const chartState = computed(() => analyticsStore.failuresByProcessAndTurma);
const subtitle = computed(() => `Ultimos ${props.days} dias · Turmas A/C vs B/D`);

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
  },
  legend: {
    data: ['Turma A e C', 'Turma B e D'],
    top: 0,
    right: 0,
    itemGap: 16,
    textStyle: { color: '#5f7077', fontSize: 12 },
  },
  grid: {
    left: 10,
    right: 20,
    top: 36,
    bottom: 12,
    containLabel: true,
  },
  xAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: { color: '#5f7077', fontSize: 11 },
    splitLine: { lineStyle: { color: '#e1e7ea' } },
  },
  yAxis: {
    type: 'category',
    data: chartState.value.labels,
    axisLabel: { color: '#17343d', fontWeight: 600, fontSize: 12 },
  },
  series: [
    {
      name: 'Turma A e C',
      type: 'bar',
      data: chartState.value.seriesAC,
      barWidth: 14,
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: '#c92a2a',
      },
      label: {
        show: true,
        position: 'right',
        color: '#4a5f67',
        fontWeight: 700,
      },
      emphasis: { itemStyle: { color: '#a82020' } },
    },
    {
      name: 'Turma B e D',
      type: 'bar',
      data: chartState.value.seriesBD,
      barWidth: 14,
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: '#ff7f50',
      },
      label: {
        show: true,
        position: 'right',
        color: '#4a5f67',
        fontWeight: 700,
      },
      emphasis: { itemStyle: { color: '#e06030' } },
    },
  ],
}));

watch(
  () => props.days,
  async (days) => {
    try {
      await analyticsStore.loadFailuresByProcessAndTurma(undefined, false, days);
    } catch {
      // Error state is handled in the store.
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.failures-turma-card {
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 22px 52px rgba(201, 42, 42, 0.12);
  border: 1px solid rgba(201, 42, 42, 0.12);
}

.eyebrow {
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  color: #9b5b4f;
}

.title {
  margin: 0 0 4px;
  font-size: 1.45rem;
  color: #17343d;
}

.subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: #7a9099;
}

.chart {
  height: 340px;
  width: 100%;
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 0;
}

.state-text {
  margin: 0;
  color: #7a9099;
  font-size: 0.9rem;
  text-align: center;
}
</style>
