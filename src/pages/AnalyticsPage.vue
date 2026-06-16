<template>
  <q-page class="heatmap-page q-pa-md q-pa-lg-xl">
    <div class="page-shell">
      <section class="hero-card q-mb-lg">
        <div class="hero-copy">
          <p class="eyebrow">Relatório Daily 5S</p>
          <h1 class="page-title">Mapa de Notas do Mês</h1>
          <p class="page-subtitle">
            Visualize os processos Daily 5S por dia e turma em formato de matriz, com destaque para
            as notas 1, 3 e 5.
          </p>
        </div>
      </section>

      <section class="filters q-mb-lg">
        <div class="month-input">
          <q-input
            readonly
            outlined
            dense
            :model-value="selectedMonthLabel"
            label="Mês"
            class="month-native"
          >
            <template #prepend>
              <q-icon name="calendar_month" />
            </template>

            <template #append>
              <q-icon name="arrow_drop_down" />
            </template>

            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="selectedMonth" view="Months" mask="YYYY-MM" minimal />
            </q-popup-proxy>
          </q-input>
        </div>

        <q-btn outline color="primary" icon="refresh" label="Atualizar" @click="handleRefresh" />
      </section>

      <Daily5sMonthlyHeatmapCard />

      <section class="issues-section q-mt-xl">
        <div class="section-header q-mb-md">
          <p class="section-eyebrow">Nova camada de análise</p>
          <h2 class="section-title">Ocorrências Daily 5S</h2>
          <p class="section-subtitle">
            Explore os motivos de nota 1 por turma e ao longo do mês, com comparação ao total geral.
          </p>
        </div>

        <section class="filters q-mb-lg">
          <div class="month-input">
            <q-input
              readonly
              outlined
              dense
              :model-value="selectedMonthLabel"
              label="Mês"
              class="month-native"
            >
              <template #prepend>
                <q-icon name="calendar_month" />
              </template>

              <template #append>
                <q-icon name="arrow_drop_down" />
              </template>

              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="selectedMonth" view="Months" mask="YYYY-MM" minimal />
              </q-popup-proxy>
            </q-input>
          </div>

          <q-btn outline color="primary" icon="refresh" label="Atualizar" @click="handleRefresh" />
        </section>

        <Daily5sIssueAnalyticsCard :month-key="selectedMonth" :date-range="currentDateRange" />

        <Daily5sTop5Rating1Card
          :month-key="selectedMonth"
          :date-range="currentDateRange"
          class="q-mt-lg"
        />

        <Daily5sActionPlanTableCard
          :month-key="selectedMonth"
          :date-range="currentDateRange"
          class="q-mt-lg"
        />
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Daily5sActionPlanTableCard from 'src/components/daily5s/analytics/Daily5sActionPlanTableCard.vue';
import Daily5sIssueAnalyticsCard from 'src/components/daily5s/analytics/Daily5sIssueAnalyticsCard.vue';
import Daily5sMonthlyHeatmapCard from 'src/components/daily5s/analytics/Daily5sMonthlyHeatmapCard.vue';
import Daily5sTop5Rating1Card from 'src/components/daily5s/analytics/Daily5sTop5Rating1Card.vue';
import { useAnalyticsStore } from 'src/stores/analytics.store';
import { toDateKey } from 'src/utils/dateFormatting';

function getCurrentMonthKey(): string {
  return toDateKey(new Date()).slice(0, 7);
}

function getMonthDefaultRange(monthKey: string): { from: string; to: string } {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!year || !month) {
    const fallback = toDateKey(new Date()).slice(0, 7);
    return { from: `${fallback}-01`, to: `${fallback}-28` };
  }
  const from = toDateKey(new Date(year, month - 1, 1));
  const to = toDateKey(new Date(year, month, 0));
  return { from, to };
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');

  if (!year || !month) {
    return monthKey;
  }

  return `${month}/${year}`;
}

const analyticsStore = useAnalyticsStore();
const selectedMonth = ref(getCurrentMonthKey());
const selectedMonthLabel = computed(() => formatMonthLabel(selectedMonth.value));
const currentDateRange = computed(() => getMonthDefaultRange(selectedMonth.value));

async function loadMonthlyAnalytics(force = false): Promise<void> {
  await analyticsStore.loadDaily5sAnalytics(selectedMonth.value, force);
}

function handleRefresh(): void {
  void loadMonthlyAnalytics(true);
}

watch(
  selectedMonth,
  () => {
    void loadMonthlyAnalytics(false);
  },
  { immediate: true },
);
</script>

<style scoped>
.heatmap-page {
  background:
    radial-gradient(circle at 12% 10%, rgba(31, 93, 152, 0.16), transparent 34%),
    radial-gradient(circle at 90% 0%, rgba(175, 42, 42, 0.13), transparent 28%),
    linear-gradient(180deg, #f6f9fb 0%, #ecf3f6 100%);
}

.page-shell {
  max-width: 1400px;
  margin: 0 auto;
}

.hero-card {
  padding: 24px;
  border-radius: 28px;
  background: linear-gradient(140deg, rgba(17, 52, 74, 0.96), rgba(34, 86, 106, 0.92)), #17343d;
  color: #ffffff;
  box-shadow: 0 20px 56px rgba(20, 43, 55, 0.2);
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.75rem;
  opacity: 0.78;
}

.page-title {
  margin: 0;
  font-size: clamp(1.9rem, 4vw, 3rem);
  line-height: 1.05;
  font-weight: 800;
}

.page-subtitle {
  max-width: 760px;
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.97rem;
}

.filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.month-input {
  min-width: 210px;
}

.month-native {
  min-height: 40px;
  width: 100%;
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .month-input {
    width: 100%;
  }
}

.issues-section {
  margin-bottom: 12px;
}

.section-header {
  padding: 0 4px;
}

.section-eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  color: #6e8490;
}

.section-title {
  margin: 6px 0 4px;
  font-size: clamp(1.25rem, 2.5vw, 1.65rem);
  line-height: 1.1;
  color: #17343d;
}

.section-subtitle {
  margin: 0;
  color: #5f7077;
  font-size: 0.9rem;
}
</style>
