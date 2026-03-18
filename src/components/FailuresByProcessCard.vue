<template>
  <q-card flat bordered class="failures-process-card">
    <q-card-section>
      <p class="eyebrow">Insight Prioritário</p>
      <h2 class="title">Falhas por Processos</h2>

      <q-badge
        v-if="mostProblematicProcess"
        color="negative"
        text-color="white"
        class="q-mt-sm"
        rounded
      >
        Processo mais problemático: {{ mostProblematicProcess }}
      </q-badge>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="40px" />
        <p class="state-text">Carregando falhas do processo...</p>
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
const loading = computed(() => analyticsStore.byProcessLoading);
const error = computed(() => analyticsStore.byProcessError);
const chartState = computed(() => analyticsStore.failuresByProcess);

const mostProblematicProcess = computed(() => chartState.value.mostProblematicProcess);

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  grid: {
    left: 10,
    right: 20,
    top: 12,
    bottom: 12,
    containLabel: true,
  },
  xAxis: {
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
  yAxis: {
    type: 'category',
    data: chartState.value.labels,
    axisLabel: {
      color: '#17343d',
      fontWeight: 600,
      fontSize: 12,
    },
  },
  series: [
    {
      name: 'Failures',
      type: 'bar',
      data: chartState.value.data,
      barWidth: 18,
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: (params: { dataIndex: number }) => (params.dataIndex === 0 ? '#c92a2a' : '#ff7f50'),
      },
      label: {
        show: true,
        position: 'right',
        color: '#4a5f67',
        fontWeight: 700,
      },
      emphasis: {
        itemStyle: {
          color: '#b02121',
        },
      },
    },
  ],
}));

onMounted(async () => {
  try {
    await analyticsStore.loadFailuresByProcess();
  } catch {
    // Error state is handled in the store.
  }
});
</script>

<style scoped>
.failures-process-card {
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
  margin: 0;
  font-size: 1.45rem;
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
