<template>
  <q-card flat bordered class="rated-card">
    <q-card-section>
      <div class="header q-mb-sm">
        <div>
          <div>
            <q-icon name="fact_check" size="28px" color="primary" class="q-mr-sm" />
            <span class="title">Processos do dia</span>
          </div>

          <div class="subtitle">Status de cada processo e as pessoas responsáveis.</div>
        </div>

        <q-chip color="primary" text-color="white" icon="calendar_today" class="chip">
          {{ ratedCount }}/{{ totalCount }} avaliados
        </q-chip>
      </div>

      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="24px" />
        <span>Carregando processos do dia...</span>
      </div>

      <div v-else-if="!inspectorId" class="state-box">
        <q-icon name="login" size="20px" color="grey-7" />
        <span>Faça login para ver os processos do dia.</span>
      </div>

      <div v-else class="table-shell">
        <q-table
          flat
          bordered
          dense
          class="process-table"
          row-key="key"
          :columns="columns"
          :rows="rows"
          v-model:pagination="pagination"
          :rows-per-page-options="[0]"
          hide-bottom
        >
          <template #body-cell-status="{ row }">
            <td class="status-cell">
              <q-icon
                :name="row.rated ? 'check_circle' : 'close'"
                :color="row.rated ? 'positive' : 'negative'"
                size="18px"
                class="q-mr-xs"
              />
              <span :class="row.rated ? 'status-label--rated' : 'status-label--pending'">
                {{ row.rated ? 'Avaliado hoje' : 'Pendente' }}
              </span>
            </td>
          </template>

          <template #body-cell-process="{ row }">
            <td>
              <div class="process-label">{{ row.label }}</div>
            </td>
          </template>
        </q-table>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAuthStore } from 'src/stores/auth.store';
import {
  getTodaysDaily5sRatedProcessKeys,
  subscribeTodaysDaily5sRatedProcessKeys,
} from 'src/services/audit';
import { DAILY5S_PROCESS_DEFINITIONS } from 'src/services/audit/daily5sDefinitions';
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
    refreshToken?: number;
  }>(),
  {
    refreshToken: 0,
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

async function loadRatedProcesses(): Promise<void> {
  if (!inspectorId.value) {
    ratedProcessKeys.value = [];
    if (unsubscribeRealtime.value) {
      unsubscribeRealtime.value();
      unsubscribeRealtime.value = null;
    }
    return;
  }

  loading.value = true;

  try {
    ratedProcessKeys.value = await getTodaysDaily5sRatedProcessKeys();

    if (unsubscribeRealtime.value) {
      unsubscribeRealtime.value();
      unsubscribeRealtime.value = null;
    }

    unsubscribeRealtime.value = subscribeTodaysDaily5sRatedProcessKeys(
      (keys) => {
        ratedProcessKeys.value = keys;
      },
      () => {
        loading.value = false;
      },
    );
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadRatedProcesses();
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
    void loadRatedProcesses();
  },
);

watch(
  () => props.refreshToken,
  () => {
    void loadRatedProcesses();
  },
);
</script>

<style scoped>
.rated-card {
  height: 400px;
  max-height: 400px;
  border-radius: 24px;
  background: white;
  box-shadow: 0 18px 48px rgba(29, 49, 57, 0.08);
}

.rated-card :deep(.q-card__section) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.header {
  display: flex;
  flex-direction: column;
}

.chip {
  width: fit-content;
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

.table-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.process-table {
  flex: 1;
  min-height: 0;
  border-radius: 12px;
}

.process-table :deep(thead tr th) {
  position: sticky;
  top: 0;
  z-index: 1;
  background: white;
}

.process-table :deep(.q-table__middle) {
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.process-table :deep(th),
.process-table :deep(td) {
  vertical-align: middle;
}

.status-cell {
  white-space: nowrap;
}

.status-label--rated {
  color: #2e9f5f;
  font-weight: 700;
}

.status-label--pending {
  color: #d64545;
  font-weight: 700;
}

.process-label {
  font-weight: 700;
  color: #17343d;
}

.state-box {
  min-height: 86px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f7077;
}

@media (max-width: 600px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
