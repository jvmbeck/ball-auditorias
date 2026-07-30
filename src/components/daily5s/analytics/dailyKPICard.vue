<template>
  <q-card class="daily-5s-kpi-card" flat bordered>
    <q-card-section>
      <div class="row items-start justify-between no-wrap">
        <div>
          <div>
            <div>
              <q-icon name="fact_check" size="28px" color="primary" class="q-mr-sm" />
              <span class="title">Pontuação de hoje</span>
            </div>

            <div class="subtitle">Somatório dos pontos obtidos nos processos avaliados.</div>
          </div>

          <div v-if="loading" class="q-mt-md">
            <q-skeleton type="text" width="110px" height="44px" />
            <q-skeleton type="text" width="170px" class="q-mt-sm" />
          </div>

          <template v-else-if="errorMessage">
            <div class="text-h5 text-negative q-mt-sm">Indisponível</div>

            <div class="text-caption text-negative q-mt-xs">
              {{ errorMessage }}
            </div>
          </template>

          <template v-else>
            <div class="text-h3 text-weight-bold q-mt-sm">{{ scorePercentage }}%</div>
            <div
              v-if="!loading && !previousAuditLoading && ratedProcessCount == totalProcessCount"
              class="q-mt-sm"
            >
              <div
                v-if="scoreDifference !== null"
                class="row items-center q-gutter-xs"
                :class="comparisonTextClass"
              >
                <q-icon :name="comparisonIcon" size="18px" />

                <span class="text-body2 text-weight-medium">
                  {{ comparisonLabel }}
                </span>
              </div>

              <div v-else class="text-caption text-grey-7">
                Sem auditoria anterior para comparação
              </div>
            </div>
            <div class="text-h6 text-grey-9 q-mt-xs">
              {{ earnedPoints }} de {{ maximumPoints }} pontos
            </div>
          </template>
        </div>
      </div>

      <q-linear-progress
        v-if="!loading && !errorMessage"
        :value="progressValue"
        rounded
        size="8px"
        color="primary"
        track-color="grey-3"
        class="q-mt-lg"
      />

      <div v-if="!loading && !errorMessage" class="row items-center justify-between q-mt-sm">
        <span class="text-caption text-grey-7">
          {{ ratedProcessCount }} de {{ totalProcessCount }} processos avaliados
        </span>

        <span class="text-caption text-grey-7">
          {{ formattedDate }}
        </span>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import type { Unsubscribe } from 'firebase/firestore';

import {
  subscribeDaily5sAuditByDate,
  getPreviousDaily5sAudit,
} from 'src/services/daily5s/dailyKPI';
import type { Daily5sAuditDocument } from 'src/types/daily5sDocuments';

const TOTAL_PROCESS_COUNT = 37;
const MAX_GRADE = 5;
const MAXIMUM_DAILY_POINTS = TOTAL_PROCESS_COUNT * MAX_GRADE; // 185

const audit = ref<Daily5sAuditDocument | null>(null);
const loading = ref(true);
const errorMessage = ref<string | null>(null);

const previousAudit = ref<Daily5sAuditDocument | null>(null);
const previousAuditLoading = ref(true);

let unsubscribeAudit: Unsubscribe | null = null;

const todayDate = getLocalDateString();

const grades = computed<number[]>(() => {
  return Object.values(audit.value?.aggregateGrades ?? {}).filter((grade) => {
    return typeof grade === 'number';
  });
});

const ratedProcessCount = computed(() => {
  return grades.value.length;
});

const earnedPoints = computed(() => {
  return grades.value.reduce((total, grade) => total + grade, 0);
});

const totalProcessCount = computed(() => {
  return TOTAL_PROCESS_COUNT;
});

const maximumPoints = computed(() => {
  return totalProcessCount.value * MAX_GRADE;
});

const scorePercentage = computed(() => {
  return calculateAuditScore(audit.value) ?? 0;
});

const previousScorePercentage = computed(() => {
  return calculateAuditScore(previousAudit.value);
});

const scoreDifference = computed<number | null>(() => {
  if (previousScorePercentage.value === null) {
    return null;
  }

  return scorePercentage.value - previousScorePercentage.value;
});

const progressValue = computed(() => {
  return scorePercentage.value / 100;
});

const formattedDate = computed(() => {
  const [year, month, day] = todayDate.split('-');

  return `${day}/${month}/${year}`;
});

const comparisonIcon = computed(() => {
  if (scoreDifference.value === null) {
    return 'remove';
  }

  if (scoreDifference.value > 0) {
    return 'trending_up';
  }

  if (scoreDifference.value < 0) {
    return 'trending_down';
  }

  return 'trending_flat';
});

const comparisonTextClass = computed(() => {
  if (scoreDifference.value === null) {
    return 'text-grey-7';
  }

  if (scoreDifference.value > 0) {
    return 'text-positive';
  }

  if (scoreDifference.value < 0) {
    return 'text-negative';
  }

  return 'text-grey-7';
});
const comparisonLabel = computed(() => {
  const difference = scoreDifference.value;
  const previousDate = previousAuditDateLabel.value;

  if (difference === null) {
    return '';
  }

  const reference = previousDate ? `da auditoria de ${previousDate}` : 'da auditoria anterior';

  if (difference > 0) {
    return `${difference} p.p. acima ${reference}`;
  }

  if (difference < 0) {
    return `${Math.abs(difference)} p.p. abaixo ${reference}`;
  }

  return `Mesmo resultado ${reference}`;
});

const previousAuditDateLabel = computed(() => {
  const date = previousAudit.value?.date;

  if (!date) {
    return null;
  }

  const [year, month, day] = date.split('-');

  return `${day}/${month}/${year}`;
});

function getLocalDateString(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
function calculateAuditScore(auditDocument: Daily5sAuditDocument | null): number | null {
  if (!auditDocument) {
    return null;
  }

  const grades = Object.values(auditDocument.aggregateGrades ?? {});

  const earnedPoints = grades.reduce((total, grade) => total + grade, 0);

  return Math.round((earnedPoints / MAXIMUM_DAILY_POINTS) * 100);
}
async function loadPreviousAudit(): Promise<void> {
  previousAuditLoading.value = true;

  try {
    previousAudit.value = await getPreviousDaily5sAudit(todayDate);
  } catch (error) {
    console.error('Failed to load previous Daily 5S audit:', error);

    previousAudit.value = null;
  } finally {
    previousAuditLoading.value = false;
  }
}

function startAuditListener(): void {
  unsubscribeAudit?.();

  loading.value = true;
  errorMessage.value = null;

  unsubscribeAudit = subscribeDaily5sAuditByDate(
    todayDate,
    (document) => {
      audit.value = document;
      loading.value = false;
    },
    (error) => {
      console.error('Failed to subscribe to the Daily 5S audit:', error);

      audit.value = null;
      errorMessage.value = 'Não foi possível carregar os dados da auditoria.';
      loading.value = false;
    },
  );
}

onMounted(() => {
  startAuditListener();
  void loadPreviousAudit();
});

onBeforeUnmount(() => {
  unsubscribeAudit?.();
  unsubscribeAudit = null;
});
</script>

<style scoped>
.daily-5s-kpi-card {
  width: 15%;
  height: 400px;
  max-height: 400px;
  border-radius: 24px;
}

.title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #17343d;
}
.subtitle {
  color: #5f7077;
  font-size: 0.8rem;
  margin: 0;
  min-height: 42px;
}
</style>
