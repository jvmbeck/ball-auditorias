<template>
  <q-card class="daily-5s-kpi-card" flat bordered>
    <q-card-section class="kpi-card__content">
      <!-- Header -->
      <header class="kpi-card__header">
        <div class="kpi-card__identity">
          <div class="kpi-card__icon">
            <q-icon name="fact_check" size="25px" />
          </div>

          <div>
            <div class="kpi-card__eyebrow">Desempenho diário</div>
            <div class="kpi-card__title">Pontuação de hoje</div>
          </div>
        </div>

        <div class="kpi-card__date">
          <q-icon name="calendar_today" size="15px" />
          <span>{{ formattedDate }}</span>
        </div>
      </header>

      <p class="kpi-card__subtitle">Somatório dos pontos obtidos nos processos avaliados.</p>

      <!-- Loading -->
      <div v-if="loading" class="kpi-card__loading">
        <q-skeleton type="text" width="145px" height="72px" />

        <div class="row items-center q-gutter-sm q-mt-sm">
          <q-skeleton type="circle" size="20px" />
          <q-skeleton type="text" width="190px" />
        </div>

        <q-skeleton
          type="rect"
          height="10px"
          class="full-width q-mt-xl"
          style="border-radius: 999px"
        />

        <div class="kpi-card__metrics q-mt-lg">
          <q-skeleton type="rect" height="72px" />
          <q-skeleton type="rect" height="72px" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="errorMessage" class="kpi-card__error">
        <div class="kpi-card__error-icon">
          <q-icon name="error_outline" size="25px" />
        </div>

        <div>
          <div class="kpi-card__error-title">Dados indisponíveis</div>
          <div class="kpi-card__error-description">
            {{ errorMessage }}
          </div>
        </div>
      </div>

      <!-- Loaded content -->
      <template v-else>
        <main class="kpi-card__main">
          <div class="kpi-card__score-row">
            <div>
              <div class="kpi-card__score">{{ scorePercentage }}<span>%</span></div>

              <div class="kpi-card__points">{{ earnedPoints }} de {{ maximumPoints }} pontos</div>
            </div>

            <div
              class="kpi-card__completion-badge"
              :class="{
                'kpi-card__completion-badge--complete': ratedProcessCount === totalProcessCount,
              }"
            >
              <q-icon
                :name="ratedProcessCount === totalProcessCount ? 'check_circle' : 'pending'"
                size="17px"
              />

              <span>
                {{
                  ratedProcessCount === totalProcessCount
                    ? 'Auditoria concluída'
                    : 'Auditoria em andamento'
                }}
              </span>
            </div>
          </div>

          <!-- Comparison -->
          <div
            v-if="!previousAuditLoading && ratedProcessCount === totalProcessCount"
            class="kpi-card__comparison"
            :class="comparisonCardClass"
          >
            <template v-if="scoreDifference !== null">
              <div class="kpi-card__comparison-icon">
                <q-icon :name="comparisonIcon" size="20px" />
              </div>

              <div>
                <div class="kpi-card__comparison-label">
                  {{ comparisonLabel }}
                </div>

                <div class="kpi-card__comparison-caption">
                  Comparação com o último resultado registrado
                </div>
              </div>
            </template>

            <template v-else>
              <div class="kpi-card__comparison-icon">
                <q-icon name="history" size="20px" />
              </div>

              <div>
                <div class="kpi-card__comparison-label">Sem auditoria anterior</div>

                <div class="kpi-card__comparison-caption">
                  Ainda não há um resultado disponível para comparação.
                </div>
              </div>
            </template>
          </div>

          <div v-else-if="previousAuditLoading" class="kpi-card__comparison-loading">
            <q-spinner size="18px" color="primary" />
            <span>Carregando comparação...</span>
          </div>

          <!-- Progress -->
          <div class="kpi-card__progress-section">
            <div class="kpi-card__progress-header">
              <span>Progresso da auditoria</span>

              <strong> {{ ratedProcessCount }}/{{ totalProcessCount }} </strong>
            </div>

            <q-linear-progress
              :value="auditCompletionValue"
              rounded
              size="9px"
              color="primary"
              track-color="blue-grey-1"
            />
          </div>
        </main>

        <!-- Supporting metrics -->
        <footer class="kpi-card__metrics">
          <div class="kpi-card__metric">
            <div class="kpi-card__metric-icon">
              <q-icon name="task_alt" size="19px" />
            </div>

            <div>
              <div class="kpi-card__metric-value">
                {{ ratedProcessCount }}
              </div>
              <div class="kpi-card__metric-label">Processos avaliados</div>
            </div>
          </div>

          <div class="kpi-card__metric">
            <div class="kpi-card__metric-icon">
              <q-icon name="stars" size="19px" />
            </div>

            <div>
              <div class="kpi-card__metric-value">
                {{ earnedPoints }}
              </div>
              <div class="kpi-card__metric-label">Pontos conquistados</div>
            </div>
          </div>
        </footer>
      </template>
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

const auditCompletionValue = computed(() => {
  if (totalProcessCount.value === 0) {
    return 0;
  }

  return ratedProcessCount.value / totalProcessCount.value;
});

const comparisonCardClass = computed(() => {
  const difference = scoreDifference.value;

  if (difference === null || difference === 0) {
    return 'kpi-card__comparison--neutral';
  }

  if (difference > 0) {
    return 'kpi-card__comparison--positive';
  }

  return 'kpi-card__comparison--negative';
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
  width: 100%;
  height: 100%;
  min-height: 390px;
  overflow: hidden;
  border-color: rgba(31, 41, 55, 0.1);
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, rgba(25, 118, 210, 0.075), transparent 15rem),
    rgba(255, 255, 255, 0.97);
  box-shadow: 0 9px 26px rgba(31, 41, 55, 0.06);
}

.kpi-card__content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 22px;
}

/* Header */

.kpi-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.kpi-card__identity {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.kpi-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  place-items: center;
  color: var(--q-primary);
  background: rgba(25, 118, 210, 0.1);
  border-radius: 13px;
}

.kpi-card__eyebrow {
  margin-bottom: 2px;
  color: var(--q-primary);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.075em;
  text-transform: uppercase;
}

.kpi-card__title {
  color: #1f2937;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
}

.kpi-card__date {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(100, 116, 139, 0.12);
  border-radius: 9px;
}

.kpi-card__subtitle {
  max-width: 430px;
  min-height: 38px;
  margin: 12px 0 0;
  color: #74808d;
  font-size: 0.8rem;
  line-height: 1.5;
}

/* Main score */

.kpi-card__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  margin-top: 16px;
}

.kpi-card__score-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.kpi-card__score {
  color: #17212b;
  font-size: clamp(2.65rem, 5vw, 3.45rem);
  font-weight: 750;
  letter-spacing: -0.055em;
  line-height: 0.95;
}

.kpi-card__score span {
  margin-left: 3px;
  color: var(--q-primary);
  font-size: 0.46em;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.kpi-card__points {
  margin-top: 8px;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 500;
}

.kpi-card__completion-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  color: #9a6700;
  font-size: 0.72rem;
  font-weight: 650;
  white-space: nowrap;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 999px;
}

.kpi-card__completion-badge--complete {
  color: #25733b;
  background: rgba(46, 125, 50, 0.09);
  border-color: rgba(46, 125, 50, 0.16);
}

/* Comparison */

.kpi-card__comparison {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 60px;
  margin-top: 20px;
  padding: 11px 13px;
  border: 1px solid transparent;
  border-radius: 12px;
}

.kpi-card__comparison-icon {
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
}

.kpi-card__comparison-label {
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.35;
}

.kpi-card__comparison-caption {
  margin-top: 2px;
  font-size: 0.68rem;
  line-height: 1.35;
  opacity: 0.76;
}

.kpi-card__comparison--positive {
  color: #256c39;
  background: rgba(46, 125, 50, 0.065);
  border-color: rgba(46, 125, 50, 0.12);
}

.kpi-card__comparison--positive .kpi-card__comparison-icon {
  background: rgba(46, 125, 50, 0.1);
}

.kpi-card__comparison--negative {
  color: #b3261e;
  background: rgba(211, 47, 47, 0.06);
  border-color: rgba(211, 47, 47, 0.12);
}

.kpi-card__comparison--negative .kpi-card__comparison-icon {
  background: rgba(211, 47, 47, 0.1);
}

.kpi-card__comparison--neutral {
  color: #5f6b78;
  background: rgba(100, 116, 139, 0.06);
  border-color: rgba(100, 116, 139, 0.11);
}

.kpi-card__comparison--neutral .kpi-card__comparison-icon {
  background: rgba(100, 116, 139, 0.1);
}

.kpi-card__comparison-loading {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 60px;
  margin-top: 20px;
  padding: 11px 13px;
  color: #718096;
  font-size: 0.75rem;
  background: rgba(100, 116, 139, 0.045);
  border: 1px solid rgba(100, 116, 139, 0.09);
  border-radius: 12px;
}

/* Progress */

.kpi-card__progress-section {
  margin-top: auto;
  padding-top: 16px;
}

.kpi-card__progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #718096;
  font-size: 0.72rem;
}

.kpi-card__progress-header strong {
  color: #334155;
  font-weight: 700;
}

/* Footer metrics */

.kpi-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 20px;
}

.kpi-card__metric {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 11px 12px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(100, 116, 139, 0.09);
  border-radius: 11px;
}

.kpi-card__metric-icon {
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--q-primary);
  background: rgba(25, 118, 210, 0.08);
  border-radius: 9px;
}

.kpi-card__metric-value {
  color: #25313c;
  font-size: 0.96rem;
  font-weight: 750;
  line-height: 1.2;
}

.kpi-card__metric-label {
  overflow: hidden;
  margin-top: 2px;
  color: #7b8794;
  font-size: 0.67rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Loading and error */

.kpi-card__loading {
  flex: 1;
  margin-top: 20px;
}

.kpi-card__error {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 24px;
  padding: 16px;
  color: #b3261e;
  background: rgba(211, 47, 47, 0.055);
  border: 1px solid rgba(211, 47, 47, 0.12);
  border-radius: 12px;
}

.kpi-card__error-icon {
  display: grid;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  place-items: center;
  background: rgba(211, 47, 47, 0.09);
  border-radius: 11px;
}

.kpi-card__error-title {
  font-size: 0.9rem;
  font-weight: 700;
}

.kpi-card__error-description {
  margin-top: 3px;
  font-size: 0.72rem;
  line-height: 1.4;
}

/* Responsive */

@media (max-width: 600px) {
  .daily-5s-kpi-card {
    min-height: 0;
  }

  .kpi-card__content {
    padding: 18px;
  }

  .kpi-card__date {
    display: none;
  }

  .kpi-card__score-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .kpi-card__completion-badge {
    align-self: flex-start;
  }

  .kpi-card__metrics {
    grid-template-columns: 1fr;
  }

  .kpi-card__metric-label {
    white-space: normal;
  }
}
</style>
