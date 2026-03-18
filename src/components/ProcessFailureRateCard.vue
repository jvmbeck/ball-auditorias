<template>
  <q-card flat bordered class="failure-rate-card">
    <q-card-section>
      <p class="eyebrow">Confiabilidade</p>
      <h2 class="title">Taxa de Falha do Processo</h2>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="40px" />
        <p class="state-text">Carregando confiabilidade do processo...</p>
      </div>

      <div v-else-if="error" class="state-box">
        <q-icon name="error" color="negative" size="28px" />
        <p class="state-text">{{ error }}</p>
      </div>

      <div v-else-if="!chartState.labels.length" class="state-box">
        <q-icon name="check_circle" color="positive" size="28px" />
        <p class="state-text">Nenhuma execução de processo encontrada no período selecionado.</p>
      </div>

      <VChart v-else autoresize :option="chartOption" class="chart" />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, provide } from 'vue';
import VChart, { THEME_KEY } from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { useAnalyticsStore } from 'src/stores/analytics.store';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);
provide(THEME_KEY, 'light');

const analyticsStore = useAnalyticsStore();
const loading = computed(() => analyticsStore.processFailureRateLoading);
const error = computed(() => analyticsStore.processFailureRateError);
const chartState = computed(() => analyticsStore.processFailureRates);

function getSeverityColor(rate: number): string {
  if (rate >= 40) {
    return '#d64545';
  }

  if (rate >= 20) {
    return '#f4b400';
  }

  return '#2e7d32';
}

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
    valueFormatter: (value: number) => `${value}%`,
  },
  grid: {
    left: 10,
    right: 16,
    top: 16,
    bottom: 40,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: chartState.value.labels,
    axisLabel: {
      color: '#17343d',
      fontSize: 11,
      interval: 0,
      rotate: chartState.value.labels.length > 4 ? 18 : 0,
    },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: {
      color: '#5f7077',
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
      name: 'Failure Rate',
      type: 'bar',
      data: chartState.value.data,
      barWidth: 24,
      itemStyle: {
        borderRadius: [8, 8, 0, 0],
        color: (params: { data: number }) => getSeverityColor(params.data),
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%',
        color: '#4a5f67',
        fontWeight: 700,
      },
    },
  ],
}));

onMounted(async () => {
  try {
    await analyticsStore.loadProcessFailureRates();
  } catch {
    // Error state is handled in the store.
  }
});
</script>

<style scoped>
.failure-rate-card {
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(29, 49, 57, 0.08);
}

.eyebrow {
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  color: #6b7f86;
}

.title {
  margin: 0;
  font-size: 1.35rem;
  color: #17343d;
}

.subtitle {
  margin: 6px 0 0;
  color: #5f7077;
  font-size: 0.92rem;
}

.state-box {
  min-height: 320px;
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

.chart {
  height: 340px;
  width: 100%;
}
</style>
