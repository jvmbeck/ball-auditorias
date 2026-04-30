<template>
  <q-page class="history-page q-pa-md q-pa-lg-xl">
    <div class="history-shell">
      <section class="header q-mb-lg">
        <p class="eyebrow">Histórico de auditorias</p>
        <h1 class="title">Auditorias Concluídas</h1>
        <p class="subtitle">
          Revise auditorias passadas e identifique rapidamente auditorias com problemas.
        </p>
      </section>

      <section class="filters q-mb-md">
        <q-select
          v-model="selectedAuditType"
          outlined
          dense
          emit-value
          map-options
          :options="auditTypeFilterOptions"
          option-label="label"
          option-value="value"
          label="Tipo de auditoria"
          class="filter-select"
        />

        <q-select
          v-model="selectedStatusFilter"
          outlined
          dense
          emit-value
          map-options
          :options="statusFilterOptions"
          option-label="label"
          option-value="value"
          label="Status"
          class="filter-select"
        />

        <q-select
          v-model="selectedTurmaFilter"
          outlined
          dense
          emit-value
          map-options
          :options="turmaFilterOptions"
          option-label="label"
          option-value="value"
          label="Turma"
          class="filter-select"
        />
      </section>

      <q-banner v-if="historyError" rounded class="q-mb-md bg-negative text-white" inline-actions>
        {{ historyError }}
      </q-banner>

      <q-card flat bordered class="history-card">
        <q-list separator>
          <template v-if="historyLoading">
            <q-item class="q-py-lg">
              <q-item-section>
                <q-skeleton type="text" width="35%" class="q-mb-sm" />
                <q-skeleton type="text" width="90%" class="q-mb-xs" />
                <q-skeleton type="text" width="70%" />
              </q-item-section>
            </q-item>
          </template>

          <template v-else-if="!filteredAuditHistory.length">
            <q-item class="q-py-lg">
              <q-item-section>
                <q-item-label class="empty-title">No completed audits yet</q-item-label>
                <q-item-label caption>
                  Nenhuma auditoria encontrada para o filtro selecionado.
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>

          <template v-else>
            <q-item
              v-for="audit in filteredAuditHistory"
              :key="audit.id"
              class="history-item history-item-clickable"
              clickable
              v-ripple
              @click="openAuditDetails(audit)"
            >
              <q-item-section>
                <q-item-label class="item-title">
                  {{ formatAuditDate(audit.completedAt) }}
                </q-item-label>

                <q-item-label caption>
                  {{ getSummaryText(audit.failedProcesses, audit.totalProcesses) }}
                </q-item-label>

                <q-item-label caption>
                  Turma {{ audit.turma ?? '-' }} • {{ formatDayOfWeek(audit.dayOfWeek) }} •
                  {{ audit.yearMonth || '-' }}
                </q-item-label>
              </q-item-section>

              <q-item-section side class="items-end">
                <q-chip
                  dense
                  text-color="white"
                  :color="audit.hasFailures ? 'negative' : 'positive'"
                >
                  {{ audit.hasFailures ? 'Problemas encontrados' : 'Todos atualizados' }}
                </q-chip>
                <q-chip dense outline color="grey-6" class="q-mt-xs">
                  {{ TYPE_LABELS[audit.type] }}
                </q-chip>
                <q-item-label caption class="q-mt-xs details-hint"
                  >Clique para ver detalhes</q-item-label
                >
              </q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-card>

      <AuditDetailsDialog
        v-model="isDetailsDialogOpen"
        :audit="selectedAudit"
        :process-definitions="activeProcessDefinitions"
      />

      <div class="q-mt-md">
        <q-btn unelevated color="primary" label="Voltar ao painel" to="/" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AuditDetailsDialog from 'src/components/AuditDetailsDialog.vue';
import { useHistoryStore } from 'src/stores/history.store';
import { formatAuditDate, formatDayOfWeek } from 'src/utils/dateFormatting';
import type { AuditType, DualAuditProcessKey, DualTypeAuditResultDocument } from 'src/types/audit';

type AuditTypeFilter = 'all' | AuditType;
type StatusFilter = 'all' | 'with_issues' | 'without_issues';
type TurmaFilter = 'all' | 'A e C' | 'B e D';

type HistoryAuditItem = {
  id: string;
  type: AuditType;
  turma: 'A e C' | 'B e D' | null;
  date: string;
  dayOfWeek: string;
  yearMonth: string;
  completedAt: Date | null;
  failedProcesses: number;
  totalProcesses: number;
  hasFailures: boolean;
  processes: Partial<Record<DualAuditProcessKey, DualTypeAuditResultDocument>>;
};

const TYPE_LABELS: Record<AuditType, string> = {
  rto: 'RTO',
  board5s: 'Quadro 5S',
};

const PROCESS_DEFINITIONS_BY_TYPE: Record<AuditType, Array<{ key: string; label: string }>> = {
  rto: [
    { key: 'frontEnd', label: 'Front End' },
    { key: 'lavadora', label: 'Lavadora' },
    { key: 'printer', label: 'Printer' },
    { key: 'necker', label: 'Necker' },
    { key: 'insideSpray', label: 'Inside Spray' },
    { key: 'paletizadora', label: 'Paletizadora' },
  ],
  board5s: [
    { key: 'minsters', label: 'Minsters' },
    { key: 'bodyMakers11to14', label: 'Body Makers 11 a 14' },
    { key: 'bodyMakers15to18', label: 'Body Makers 15 a 18' },
    { key: 'bodyMakers19to23', label: 'Body Makers 19 a 23' },
    { key: 'bodyMakers24to31', label: 'Body Makers 24 a 31' },
    { key: 'printer1', label: 'Printer 1' },
    { key: 'printer2e3', label: 'Printer 2 e 3' },
  ],
};

const historyStore = useHistoryStore();
const selectedAuditType = ref<AuditTypeFilter>('all');
const selectedStatusFilter = ref<StatusFilter>('all');
const selectedTurmaFilter = ref<TurmaFilter>('all');

const auditTypeFilterOptions = computed<Array<{ label: string; value: AuditTypeFilter }>>(() => {
  const typeOptions = (Object.entries(TYPE_LABELS) as Array<[AuditType, string]>).map(
    ([value, label]) => ({ value, label }),
  );

  return [{ value: 'all', label: 'Todos os tipos' }, ...typeOptions];
});

const statusFilterOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Com problemas', value: 'with_issues' },
  { label: 'Sem problemas', value: 'without_issues' },
];

const turmaFilterOptions: Array<{ label: string; value: TurmaFilter }> = [
  { label: 'Todas as turmas', value: 'all' },
  { label: 'Turma A e C', value: 'A e C' },
  { label: 'Turma B e D', value: 'B e D' },
];

const auditHistory = computed<HistoryAuditItem[]>(() => {
  const rto = historyStore.historyByType.rto ?? [];
  const board5s = historyStore.historyByType.board5s ?? [];
  return [...rto, ...board5s].sort((a, b) => {
    const aTime = a.completedAt?.getTime() ?? 0;
    const bTime = b.completedAt?.getTime() ?? 0;
    return bTime - aTime;
  });
});

const filteredAuditHistory = computed<HistoryAuditItem[]>(() => {
  return auditHistory.value.filter((audit) => {
    const typeMatches = selectedAuditType.value === 'all' || audit.type === selectedAuditType.value;

    const statusMatches =
      selectedStatusFilter.value === 'all' ||
      (selectedStatusFilter.value === 'with_issues' && audit.hasFailures) ||
      (selectedStatusFilter.value === 'without_issues' && !audit.hasFailures);

    const turmaMatches =
      selectedTurmaFilter.value === 'all' || audit.turma === selectedTurmaFilter.value;

    return typeMatches && statusMatches && turmaMatches;
  });
});

const historyLoading = computed(() => Object.values(historyStore.loadingByType).some(Boolean));

const historyError = computed(() => {
  const errors = Object.values(historyStore.errorByType).filter(Boolean) as string[];
  return errors.length ? errors.join(' | ') : null;
});

const isDetailsDialogOpen = ref(false);
const selectedAudit = ref<HistoryAuditItem | null>(null);

const activeProcessDefinitions = computed(() =>
  selectedAudit.value ? PROCESS_DEFINITIONS_BY_TYPE[selectedAudit.value.type] : [],
);

function getSummaryText(failedProcesses: number, totalProcesses: number): string {
  if (failedProcesses === 0) {
    return `${totalProcesses} / ${totalProcesses} processos atualizados`;
  }
  const updatedProcesses = Math.max(totalProcesses - failedProcesses, 0);
  return `${updatedProcesses} atualizados, ${failedProcesses} com problemas`;
}

function openAuditDetails(audit: HistoryAuditItem) {
  selectedAudit.value = audit;
  isDetailsDialogOpen.value = true;
}

onMounted(() => {
  void historyStore.loadAllHistory();
});
</script>

<style scoped>
.history-page {
  background: linear-gradient(180deg, #f5f7f4 0%, #edf2ef 100%);
}

.history-shell {
  max-width: 860px;
  margin: 0 auto;
}

.header {
  margin-top: 12px;
}

.history-card {
  border-radius: 28px;
  background: white;
  box-shadow: 0 18px 48px rgba(29, 49, 57, 0.08);
}

.history-item {
  min-height: 78px;
}

.history-item-clickable {
  cursor: pointer;
}

.item-title {
  font-size: 1rem;
  font-weight: 700;
  color: #17343d;
}

.details-hint {
  color: #5f7077;
}

.empty-title {
  font-size: 1rem;
  font-weight: 700;
  color: #17343d;
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  color: #58727c;
}

.title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1;
  color: #17343d;
}

.subtitle {
  margin: 14px 0 0;
  color: #5f7077;
  font-size: 1rem;
}

.filters {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  min-width: 240px;
  max-width: 240px;
  width: 100%;
}

@media (max-width: 640px) {
  .filters {
    justify-content: stretch;
  }

  .filter-select {
    max-width: none;
  }
}
</style>
