<template>
  <q-card flat bordered class="score-card">
    <q-card-section>
      <div class="header q-mb-sm">
        <q-icon name="show_chart" size="24px" color="primary" class="q-mr-sm" />
        <div>
          <div class="title">Pontuacao Daily 5S (%)</div>
          <div class="subtitle">{{ turmaSubtitle }}</div>
        </div>
      </div>

      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="24px" />
        <span>Carregando pontuacoes...</span>
      </div>

      <div v-else-if="error" class="state-box">
        <q-icon name="error" size="20px" color="negative" />
        <span>{{ error }}</span>
      </div>

      <div v-else-if="!props.turma" class="state-box">
        <q-icon name="groups" size="20px" color="grey-7" />
        <span>Selecione a turma para visualizar o grafico.</span>
      </div>

      <div v-else>
        <div class="kpi-row q-mb-sm">
          <q-chip color="primary" text-color="white" icon="query_stats">
            {{ latestPercentage }}% ({{ latestTotal }}/{{ DAILY5S_MAX_SCORE }})
          </q-chip>
          <span class="kpi-hint">Resultado do dia mais recente no periodo.</span>
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
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import {
  DAILY5S_MAX_SCORE,
  fetchDaily5sScoreTrend,
} from 'src/services/audit/analytics.daily5sScores';
import type { Daily5sScoreTrendData } from 'src/types/audit';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);
provide(THEME_KEY, 'light');

const props = withDefaults(
  defineProps<{
    turma: 'A e C' | 'B e D' | null;
    refreshToken?: number;
    days?: number;
  }>(),
  {
    refreshToken: 0,
    days: 7,
  },
);

const loading = ref(false);
const error = ref<string | null>(null);
const scoreTrend = ref<Daily5sScoreTrendData>({
  labels: [],
  percentages: [],
  totals: [],
  percentagesByDate: {},
  totalsByDate: {},
});

const turmaSubtitle = computed(() => {
  if (!props.turma) {
    return 'Uma turma por vez (a turma ativa do dia)';
  }

  return `Turma ${props.turma} - percentual da pontuacao diaria sobre ${DAILY5S_MAX_SCORE}`;
});

const latestTotal = computed(() => {
  if (!scoreTrend.value.totals.length) {
    return 0;
  }

  return scoreTrend.value.totals[scoreTrend.value.totals.length - 1] ?? 0;
});

const latestPercentage = computed(() => {
  if (!scoreTrend.value.percentages.length) {
    return 0;
  }

  return scoreTrend.value.percentages[scoreTrend.value.percentages.length - 1] ?? 0;
});

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) {
    return dateKey;
  }

  return `${day}/${month}`;
}

function formatTooltipValue(value: unknown): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return '0%';
  }

  return `${numeric}%`;
}

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: unknown) => formatTooltipValue(value),
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
      name: 'Pontuacao',
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbolSize: 7,
      itemStyle: {
        color: '#129e7b',
      },
      lineStyle: {
        width: 3,
        color: '#129e7b',
      },
      areaStyle: {
        color: 'rgba(18, 158, 123, 0.12)',
      },
      data: scoreTrend.value.percentages,
    },
  ],
}));

async function loadScoreTrend() {
  if (!props.turma) {
    error.value = null;
    scoreTrend.value = {
      labels: [],
      percentages: [],
      totals: [],
      percentagesByDate: {},
      totalsByDate: {},
    };
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    scoreTrend.value = await fetchDaily5sScoreTrend(props.turma, props.days);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar pontuacoes.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadScoreTrend();
});

watch(
  () => [props.turma, props.days, props.refreshToken],
  () => {
    void loadScoreTrend();
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

.kpi-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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
