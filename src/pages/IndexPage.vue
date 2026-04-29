<template>
  <q-page class="index-page q-pa-md q-pa-lg-xl">
    <div class="index-shell">
      <!-- Hero section -->
      <section class="hero q-mb-xl">
        <p class="eyebrow">Ball</p>
        <h1 class="hero-title">Auditorias</h1>
      </section>

      <!-- Audit cards -->
      <section class="audit-cards-grid q-mb-xl">
        <DailyAuditCard />
        <Checklist5SCard />
      </section>

      <!-- Analytics section -->
      <section class="analytics-section">
        <div class="analytics-header q-mb-md">
          <div>
            <p class="eyebrow">Análises</p>
            <h2 class="section-title">Insights de Performance</h2>
            <p class="subtitle">
              Identifique quais processos estão apresentando mais falhas e priorize ações de
              melhoria.
            </p>
          </div>

          <div class="analytics-controls">
            <q-btn
              outline
              color="primary"
              icon="refresh"
              label="Atualizar"
              :loading="refreshingAnalytics"
              @click="handleRefreshAnalytics"
              class="q-mr-md"
            />

            <q-select
              v-model="selectedDays"
              outlined
              dense
              :options="daysOptions"
              option-value="value"
              option-label="label"
              emit-value
              map-options
              label="Selecione o período"
              class="days-select"
            />
          </div>
        </div>

        <!-- Responsive charts grid -->
        <div class="charts-grid">
          <div class="chart-item">
            <FailuresByProcessAndTurmaCard :days="selectedDays" />
          </div>
          <div class="chart-item">
            <FailuresByDateAndProcessCard :days="selectedDays" />
          </div>
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import Checklist5SCard from 'src/components/Checklist5SCard.vue';
import DailyAuditCard from 'src/components/DailyAuditCard.vue';
import FailuresByDateAndProcessCard from 'src/components/FailuresByDateAndProcessCard.vue';
import FailuresByProcessAndTurmaCard from 'src/components/FailuresByProcessAndTurmaCard.vue';
import { useAnalyticsStore } from 'src/stores/analytics.store';

const $q = useQuasar();
const analyticsStore = useAnalyticsStore();

const refreshingAnalytics = ref(false);
const selectedDays = ref<number>(30);

const daysOptions = [
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 14 dias', value: 14 },
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Últimos 60 dias', value: 60 },
  { label: 'Últimos 90 dias', value: 90 },
];

async function handleRefreshAnalytics() {
  refreshingAnalytics.value = true;

  try {
    await analyticsStore.refreshAllAnalytics(selectedDays.value);
    $q.notify({
      type: 'positive',
      message: 'Dados atualizados com sucesso.',
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível atualizar os dados no momento.',
    });
  } finally {
    refreshingAnalytics.value = false;
  }
}
</script>

<style scoped>
.index-page {
  background: linear-gradient(160deg, #f4f7f5 0%, #eaf1ec 100%);
  min-height: 100vh;
}

.index-shell {
  max-width: 1320px;
  margin: 0 auto;
  padding-top: min(10vh, 84px);
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.78rem;
  color: #5f7077;
}

.hero-title {
  margin: 0;
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  font-weight: 800;
  line-height: 1;
  color: #17343d;
}

.hero-subtitle {
  margin: 12px 0 0;
  color: #5f7077;
  font-size: 1rem;
}

.analytics-section {
  margin-top: 2rem;
}

.audit-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.analytics-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 2rem;
}

.section-title {
  margin: 0;
  font-size: 1.35rem;
  color: #17343d;
  font-weight: 700;
}

.analytics-controls {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.days-select {
  min-width: 180px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.chart-item {
  width: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .analytics-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .analytics-controls {
    flex-direction: column;
  }

  .audit-cards-grid {
    grid-template-columns: 1fr;
  }

  .days-select {
    width: 100%;
    min-width: unset;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1100px) {
  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1101px) {
  .charts-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
