<template>
  <q-card flat bordered class="rated-card">
    <q-card-section class="rated-card__content">
      <!-- Header -->
      <header class="rated-card__header">
        <div class="rated-card__identity">
          <div class="rated-card__icon">
            <q-icon name="playlist_add_check_circle" size="25px" />
          </div>

          <div>
            <div class="rated-card__eyebrow">Acompanhamento diário</div>
            <div class="rated-card__title">Processos de hoje</div>
          </div>
        </div>

        <div
          class="rated-card__summary"
          :class="{
            'rated-card__summary--complete': auditIsComplete,
          }"
        >
          <q-icon :name="auditIsComplete ? 'check_circle' : 'pending_actions'" size="17px" />

          <span>{{ ratedCount }}/{{ totalCount }} avaliados</span>
        </div>
      </header>

      <p class="rated-card__subtitle">
        Consulte o status dos processos e os responsáveis pela auditoria de hoje.
      </p>

      <!-- Loading -->
      <div v-if="loading" class="rated-card__state">
        <div class="rated-card__state-icon rated-card__state-icon--loading">
          <q-spinner color="primary" size="24px" />
        </div>

        <div>
          <div class="rated-card__state-title">Carregando processos</div>
          <div class="rated-card__state-description">
            Buscando o status atualizado da auditoria.
          </div>
        </div>
      </div>

      <!-- Not authenticated -->
      <div v-else-if="!inspectorId" class="rated-card__state">
        <div class="rated-card__state-icon">
          <q-icon name="login" size="23px" />
        </div>

        <div>
          <div class="rated-card__state-title">Acesso necessário</div>
          <div class="rated-card__state-description">
            Faça login para visualizar os processos de hoje.
          </div>
        </div>
      </div>

      <!-- Table -->
      <div v-else class="table-shell">
        <q-table
          flat
          dense
          class="process-table"
          row-key="key"
          :columns="columns"
          :rows="rows"
          v-model:pagination="pagination"
          :rows-per-page-options="[0]"
          hide-bottom
          separator="horizontal"
        >
          <template #header="props">
            <q-tr :props="props" class="process-table__header-row">
              <q-th
                v-for="column in props.cols"
                :key="column.name"
                :props="props"
                class="process-table__header-cell"
              >
                {{ column.label }}
              </q-th>
            </q-tr>
          </template>

          <template #body="props">
            <q-tr
              :props="props"
              class="process-table__row"
              :class="{
                'process-table__row--rated': props.row.rated,
              }"
            >
              <q-td key="status" :props="props">
                <div
                  class="status-pill"
                  :class="props.row.rated ? 'status-pill--rated' : 'status-pill--pending'"
                >
                  <q-icon :name="props.row.rated ? 'check_circle' : 'schedule'" size="15px" />

                  <span>
                    {{ props.row.rated ? 'Avaliado' : 'Pendente' }}
                  </span>
                </div>
              </q-td>

              <q-td key="process" :props="props">
                <div class="process-cell">
                  <div
                    class="process-cell__marker"
                    :class="{
                      'process-cell__marker--rated': props.row.rated,
                    }"
                  />

                  <div class="process-label">
                    {{ props.row.label }}
                  </div>
                </div>
              </q-td>

              <q-td key="auditor" :props="props">
                <div class="person-cell">
                  <q-icon name="person_outline" size="16px" class="person-cell__icon" />
                  <span>{{ props.row.auditor }}</span>
                </div>
              </q-td>

              <q-td key="backup" :props="props">
                <div class="person-cell person-cell--secondary">
                  {{ props.row.backup }}
                </div>
              </q-td>

              <q-td key="responsible" :props="props">
                <div class="person-cell person-cell--secondary">
                  {{ props.row.responsible }}
                </div>
              </q-td>
            </q-tr>
          </template>

          <template #no-data>
            <div class="rated-card__empty">
              <q-icon name="inbox" size="28px" />
              <span>Nenhum processo encontrado.</span>
            </div>
          </template>
        </q-table>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAuthStore } from 'src/stores/auth.store';
import { subscribeDaily5sRatedProcessKeysByDate } from 'src/services/daily5s';
import { DAILY5S_PROCESS_DEFINITIONS } from 'src/services/daily5s/daily5sDefinitions';
import { DAILY5S_PROCESS_ROSTER } from 'src/data/daily5sProcessRoster';
import type { QTableProps } from 'quasar';
import type { Daily5sAuditProcessKey } from 'src/types/audit';

interface ProcessRow {
  key: Daily5sAuditProcessKey;
  label: string;
  rated: boolean;
  auditor: string;
  backup: string;
  responsible: string;
}

const props = withDefaults(
  defineProps<{
    auditDate?: string;
  }>(),
  {
    auditDate: '',
  },
);

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const columns: QTableProps['columns'] = [
  {
    name: 'status',
    label: 'Status',
    field: 'rated',
    sortable: true,
    align: 'left',
    style: 'width: 160px',
    sort: (a: boolean, b: boolean, rowA: ProcessRow, rowB: ProcessRow) => {
      if (a === b) return collator.compare(rowA.label, rowB.label);
      return a ? 1 : -1;
    },
  },
  {
    name: 'process',
    label: 'Processo',
    field: 'label',
    sortable: true,
    align: 'left',
    sort: (a: string, b: string) => collator.compare(a, b),
  },
  {
    name: 'auditor',
    label: 'Auditor',
    field: 'auditor',
    sortable: true,
    align: 'left',
    sort: (a: string, b: string, rowA: ProcessRow, rowB: ProcessRow) => {
      const cmp = collator.compare(a, b);
      return cmp !== 0 ? cmp : collator.compare(rowA.label, rowB.label);
    },
  },
  { name: 'backup', label: 'Backup', field: 'backup', sortable: false, align: 'left' },
  {
    name: 'responsible',
    label: 'Responsável',
    field: 'responsible',
    sortable: false,
    align: 'left',
  },
];

const pagination = ref({ sortBy: 'process', descending: false, rowsPerPage: 0 });

const authStore = useAuthStore();
const inspectorId = computed(() => authStore.firebaseUser?.uid ?? null);
const loading = ref(false);
const ratedProcessKeys = ref<Daily5sAuditProcessKey[]>([]);
const unsubscribeRealtime = ref<(() => void) | null>(null);

const totalCount = computed(() => DAILY5S_PROCESS_DEFINITIONS.length);
const ratedCount = computed(() => ratedProcessKeys.value.length);

const ratedProcessKeySet = computed(() => new Set<Daily5sAuditProcessKey>(ratedProcessKeys.value));

const auditIsComplete = computed(() => {
  return totalCount.value > 0 && ratedCount.value === totalCount.value;
});

function getLocalDateString(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const rows = computed<ProcessRow[]>(() =>
  DAILY5S_PROCESS_DEFINITIONS.map((definition) => {
    const roster = DAILY5S_PROCESS_ROSTER[definition.key];
    const rated = ratedProcessKeySet.value.has(definition.key);

    return {
      key: definition.key,
      label: definition.label,
      rated,
      auditor: roster.auditor || 'A definir',
      backup: roster.backup || 'A definir',
      responsible: roster.responsible || 'A definir',
    };
  }),
);

function startRatedProcessesListener(): void {
  if (!inspectorId.value) {
    ratedProcessKeys.value = [];
    loading.value = false;

    if (unsubscribeRealtime.value) {
      unsubscribeRealtime.value();
      unsubscribeRealtime.value = null;
    }

    return;
  }

  loading.value = true;

  if (unsubscribeRealtime.value) {
    unsubscribeRealtime.value();
  }

  const date = props.auditDate || getLocalDateString();

  unsubscribeRealtime.value = subscribeDaily5sRatedProcessKeysByDate(
    date,
    (keys) => {
      ratedProcessKeys.value = keys;
      loading.value = false;
    },
    () => {
      loading.value = false;
    },
  );
}

onMounted(() => {
  startRatedProcessesListener();
});

onBeforeUnmount(() => {
  if (unsubscribeRealtime.value) {
    unsubscribeRealtime.value();
    unsubscribeRealtime.value = null;
  }
});

watch(
  () => inspectorId.value,
  () => {
    startRatedProcessesListener();
  },
);

watch(
  () => props.auditDate,
  () => {
    startRatedProcessesListener();
  },
);
</script>

<style scoped>
.rated-card {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-color: rgba(31, 41, 55, 0.1);
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, rgba(25, 118, 210, 0.075), transparent 15rem),
    rgba(255, 255, 255, 0.97);
  box-shadow: 0 9px 26px rgba(31, 41, 55, 0.06);
}

.rated-card__content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 22px;
}

/* Header */

.rated-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.rated-card__identity {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.rated-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  place-items: center;
  color: var(--q-primary);
  background: rgba(25, 118, 210, 0.1);
  border-radius: 13px;
}

.rated-card__eyebrow {
  margin-bottom: 2px;
  color: var(--q-primary);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.075em;
  text-transform: uppercase;
}

.rated-card__title {
  color: #1f2937;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
}

.rated-card__subtitle {
  max-width: 470px;
  margin: 12px 0 0;
  color: #74808d;
  font-size: 0.8rem;
  line-height: 1.5;
}

.rated-card__summary {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  color: #245f99;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  background: rgba(25, 118, 210, 0.08);
  border: 1px solid rgba(25, 118, 210, 0.14);
  border-radius: 999px;
}

.rated-card__summary--complete {
  color: #25733b;
  background: rgba(46, 125, 50, 0.09);
  border-color: rgba(46, 125, 50, 0.16);
}

/* Progress */

.rated-card__progress {
  margin-top: 16px;
}

.rated-card__progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  color: #718096;
  font-size: 0.71rem;
}

.rated-card__progress-header strong {
  color: #334155;
  font-weight: 700;
}

/* Table container */

.table-shell {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  margin-top: 16px;
  overflow: hidden;
  border: 1px solid rgba(100, 116, 139, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
}

.process-table {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  background: transparent;
}

.process-table :deep(.q-table__container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.process-table :deep(.q-table__middle) {
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.3) transparent;
}

.process-table :deep(table) {
  table-layout: auto;
}

.process-table :deep(thead tr) {
  position: sticky;
  top: 0;
  z-index: 2;
}

.process-table :deep(thead th) {
  height: 42px;
  padding: 0 12px;
  color: #64748b;
  font-size: 0.67rem;
  font-weight: 750;
  letter-spacing: 0.045em;
  text-transform: uppercase;
  background: #f8fafc;
  border-bottom: 1px solid rgba(100, 116, 139, 0.12);
}

.process-table :deep(tbody td) {
  height: 46px;
  padding: 7px 12px;
  color: #475569;
  font-size: 0.76rem;
  border-color: rgba(100, 116, 139, 0.08);
}

.process-table__row {
  transition: background-color 150ms ease;
}

.process-table__row:hover {
  background: rgba(25, 118, 210, 0.035);
}

.process-table__row--rated {
  background: rgba(46, 125, 50, 0.018);
}

/* Status */

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 88px;
  padding: 5px 8px;
  font-size: 0.68rem;
  font-weight: 700;
  border: 1px solid transparent;
  border-radius: 999px;
}

.status-pill--rated {
  color: #28733e;
  background: rgba(46, 125, 50, 0.08);
  border-color: rgba(46, 125, 50, 0.13);
}

.status-pill--pending {
  color: #9a6700;
  background: rgba(245, 158, 11, 0.09);
  border-color: rgba(245, 158, 11, 0.15);
}

/* Process and people */

.process-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.process-cell__marker {
  width: 5px;
  height: 22px;
  flex: 0 0 auto;
  background: rgba(245, 158, 11, 0.65);
  border-radius: 999px;
}

.process-cell__marker--rated {
  background: rgba(46, 125, 50, 0.7);
}

.process-label {
  color: #273542;
  font-size: 0.77rem;
  font-weight: 700;
  line-height: 1.3;
}

.person-cell {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #475569;
  white-space: nowrap;
}

.person-cell__icon {
  color: #94a3b8;
}

.person-cell--secondary {
  color: #64748b;
}

/* States */

.rated-card__state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 13px;
  min-height: 0;
  margin-top: 16px;
  padding: 22px;
  color: #64748b;
  background: rgba(248, 250, 252, 0.75);
  border: 1px solid rgba(100, 116, 139, 0.1);
  border-radius: 12px;
}

.rated-card__state-icon {
  display: grid;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  place-items: center;
  color: #64748b;
  background: rgba(100, 116, 139, 0.08);
  border-radius: 11px;
}

.rated-card__state-icon--loading {
  background: rgba(25, 118, 210, 0.08);
}

.rated-card__state-title {
  color: #334155;
  font-size: 0.82rem;
  font-weight: 700;
}

.rated-card__state-description {
  margin-top: 2px;
  color: #7b8794;
  font-size: 0.7rem;
  line-height: 1.4;
}

.rated-card__empty {
  display: flex;
  width: 100%;
  min-height: 120px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #7b8794;
  font-size: 0.76rem;
}

/* Responsive */

@media (max-width: 600px) {
  .rated-card {
    height: auto;
    min-height: 430px;
  }

  .rated-card__content {
    padding: 18px;
  }

  .rated-card__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .rated-card__summary {
    align-self: flex-start;
  }

  .table-shell {
    min-height: 280px;
  }

  .process-table :deep(thead th),
  .process-table :deep(tbody td) {
    padding-right: 9px;
    padding-left: 9px;
  }
}
</style>
