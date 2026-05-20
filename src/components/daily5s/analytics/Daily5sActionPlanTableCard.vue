<template>
  <q-card flat bordered class="action-plan-card">
    <q-card-section>
      <div class="header q-mb-sm">
        <q-icon name="assignment_turned_in" size="24px" color="primary" class="q-mr-sm" />
        <div>
          <div class="title">Planos de ação</div>
          <div class="subtitle">Ocorrências com nota 1 e quem deve atuar para correção.</div>
        </div>

        <q-chip color="primary" text-color="white" icon="task_alt" class="q-ml-auto">
          {{ actionPlanData.total }} pendências
        </q-chip>
      </div>

      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="24px" />
        <span>Carregando planos de ação...</span>
      </div>

      <div v-else-if="error" class="state-box">
        <q-icon name="error" size="20px" color="negative" />
        <span>{{ error }}</span>
      </div>

      <div v-else-if="!hasData" class="state-box">
        <q-icon name="check_circle" size="20px" color="positive" />
        <span>Nenhuma ocorrência com nota 1 no período selecionado.</span>
      </div>

      <div v-else class="table-shell">
        <q-table
          flat
          bordered
          dense
          class="action-plan-table"
          row-key="id"
          :columns="columns"
          :rows="actionPlanData.rows"
          v-model:pagination="pagination"
          :rows-per-page-options="[0]"
          hide-bottom
        >
          <template #body-cell-date="{ row }">
            <td>{{ formatDate(row.date) }}</td>
          </template>

          <template #body-cell-whoShouldAct="{ row }">
            <td>
              <q-chip dense color="orange-8" text-color="white">{{ row.whoShouldAct }}</q-chip>
            </td>
          </template>
        </q-table>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { QTableProps } from 'quasar';
import { useAnalyticsStore } from 'src/stores/analytics.store';
import type { Daily5sActionPlanData } from 'src/types/audit';

const props = withDefaults(
  defineProps<{
    monthKey: string;
    startDateKey?: string;
    endDateKey?: string;
    refreshToken?: number;
  }>(),
  {
    refreshToken: 0,
  },
);

const analyticsStore = useAnalyticsStore();

const pagination = ref({ sortBy: 'date', descending: true, rowsPerPage: 0 });

const columns: QTableProps['columns'] = [
  { name: 'date', label: 'Data', field: 'date', align: 'left', sortable: true },
  { name: 'turma', label: 'Turma', field: 'turma', align: 'left', sortable: true },
  { name: 'process', label: 'Processo', field: 'process', align: 'left', sortable: true },
  { name: 'auditor', label: 'Auditor', field: 'auditor', align: 'left', sortable: true },
  {
    name: 'processResponsible',
    label: 'Responsavel do processo',
    field: 'processResponsible',
    align: 'left',
    sortable: true,
  },
  { name: 'reason', label: 'Motivo da nota 1', field: 'reason', align: 'left', sortable: true },
  {
    name: 'whoShouldAct',
    label: 'Quem deve atuar',
    field: 'whoShouldAct',
    align: 'left',
    sortable: true,
  },
];

function toMonthBounds(monthKey: string): { from: string; to: string } {
  const valid = /^\d{4}-\d{2}$/.test(monthKey);
  const base = valid ? `${monthKey}-01` : new Date().toISOString().slice(0, 7) + '-01';
  const monthDate = new Date(`${base}T00:00:00`);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  const from = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(monthStart.getDate()).padStart(2, '0')}`;
  const to = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

  return { from, to };
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getEffectiveRange(): { from: string; to: string } {
  const fallback = toMonthBounds(props.monthKey);
  let from = isDateKey(props.startDateKey) ? props.startDateKey : fallback.from;
  let to = isDateKey(props.endDateKey) ? props.endDateKey : fallback.to;

  if (from > to) {
    [from, to] = [to, from];
  }

  return { from, to };
}

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) {
    return dateKey;
  }

  return `${day}/${month}/${year}`;
}

const loading = computed(() => analyticsStore.daily5sAnalyticsLoading);
const error = computed(() => analyticsStore.daily5sAnalyticsError);

const actionPlanData = computed<Daily5sActionPlanData>(() => {
  if (analyticsStore.daily5sMonthlyHeatmapMonth !== props.monthKey) {
    return { rows: [], total: 0 };
  }

  const { from, to } = getEffectiveRange();
  return analyticsStore.getDaily5sActionPlanByRange(from, to);
});

const hasData = computed(() => actionPlanData.value.total > 0);

async function loadHeatmap(force = false): Promise<void> {
  await analyticsStore.loadDaily5sAnalytics(props.monthKey, force);
}

onMounted(() => {
  void loadHeatmap(false);
});

watch(
  () => props.monthKey,
  () => {
    void loadHeatmap(false);
  },
);

watch(
  () => props.refreshToken,
  () => {
    void loadHeatmap(true);
  },
);
</script>

<style scoped>
.action-plan-card {
  border-radius: 24px;
  background: #ffffff;
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

.table-shell {
  display: flex;
  flex-direction: column;
}

.action-plan-table {
  border-radius: 12px;
}

.action-plan-table :deep(th),
.action-plan-table :deep(td) {
  vertical-align: middle;
}

.state-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 120px;
  color: #5f7077;
  text-align: center;
}
</style>
