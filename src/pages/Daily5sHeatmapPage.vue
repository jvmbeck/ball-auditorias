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
        <label class="month-input">
          <span class="month-label">Mês</span>
          <input v-model="selectedMonth" type="month" class="month-native" />
        </label>

        <q-btn outline color="primary" icon="refresh" label="Atualizar" @click="handleRefresh" />

        <q-btn flat color="primary" icon="arrow_back" label="Voltar" @click="goBack" />
      </section>

      <Daily5sMonthlyHeatmapCard :month-key="selectedMonth" :refresh-token="refreshToken" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Daily5sMonthlyHeatmapCard from 'src/components/daily5s/analytics/Daily5sMonthlyHeatmapCard.vue';
import { toDateKey } from 'src/utils/dateFormatting';

function getCurrentMonthKey(): string {
  return toDateKey(new Date()).slice(0, 7);
}

const router = useRouter();
const selectedMonth = ref(getCurrentMonthKey());
const refreshToken = ref(0);

function handleRefresh(): void {
  refreshToken.value += 1;
}

function goBack(): void {
  void router.push({ name: 'index' });
}
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
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.month-label {
  color: #4d5f66;
  font-size: 0.82rem;
  font-weight: 600;
}

.month-native {
  min-height: 40px;
  border: 1px solid #c4d1d9;
  border-radius: 8px;
  padding: 0 12px;
  background: #ffffff;
  color: #17343d;
  font-size: 0.95rem;
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
</style>
