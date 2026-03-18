<template>
  <q-card flat bordered class="failures-card">
    <q-card-section>
      <p class="eyebrow">Dashboard</p>
      <h2 class="title">Falhas ao Longo do Tempo</h2>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="40px" />
        <p class="state-text">Carregando tendência de falhas...</p>
      </div>

      <div v-else-if="error" class="state-box">
        <q-icon name="error" color="negative" size="28px" />
        <p class="state-text">{{ error }}</p>
      </div>

      <div v-else-if="!hasAnyFailures" class="state-box">
        <q-icon name="insights" color="positive" size="28px" />
        <p class="state-text">Nenhuma falha encontrada no período selecionado.</p>
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
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { useAnalyticsStore } from 'src/stores/analytics.store';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);
provide(THEME_KEY, 'light');

const analyticsStore = useAnalyticsStore();
const loading = computed(() => analyticsStore.overTimeLoading);
const error = computed(() => analyticsStore.overTimeError);
const chartState = computed(() => analyticsStore.failuresOverTime);

const hasAnyFailures = computed(() => chartState.value.data.some((value) => value > 0));

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
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
    data: chartState.value.labels,
    axisLabel: {
      color: '#5f7077',
      fontSize: 11,
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
  series: [
    {
      name: 'Failures',
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbolSize: 7,
      itemStyle: {
        color: '#d64545',
      },
      lineStyle: {
        width: 3,
        color: '#d64545',
      },
      areaStyle: {
        color: 'rgba(214, 69, 69, 0.10)',
      },
      data: chartState.value.data,
    },
  ],
}));

onMounted(async () => {
  try {
    await analyticsStore.loadFailuresOverTime();
  } catch {
    // Error state is handled in the store.
  }
});
</script>

<style scoped>
.failures-card {
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

.chart {
  height: 320px;
  width: 100%;
}
</style>
