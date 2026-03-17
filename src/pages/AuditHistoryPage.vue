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

          <template v-else-if="!auditHistory.length">
            <q-item class="q-py-lg">
              <q-item-section>
                <q-item-label class="empty-title">No completed audits yet</q-item-label>
                <q-item-label caption>
                  Finish an audit to start building your history timeline.
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>

          <template v-else>
            <q-item
              v-for="audit in auditHistory"
              :key="audit.id"
              class="history-item history-item-clickable"
              clickable
              v-ripple
              @click="openAuditDetails(audit)"
            >
              <q-item-section>
                <q-item-label class="item-title">
                  {{ formatAuditDate(audit.createdAt) }}
                </q-item-label>

                <q-item-label caption>
                  {{ getSummaryText(audit.failedProcesses, audit.totalProcesses) }}
                </q-item-label>

                <q-item-label caption>
                  Turma {{ audit.turma ?? '-' }} • {{ formatDayOfWeek(audit.dayOfWeek) }} •
                  {{ audit.yearMonth || '-' }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-chip
                  dense
                  text-color="white"
                  :color="audit.hasFailures ? 'negative' : 'positive'"
                >
                  {{ audit.hasFailures ? 'Problemas encontrados' : 'Todos atualizados' }}
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
        :process-definitions="processDefinitions"
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
import { useAuditStore } from 'src/stores/audit.store';
import { formatAuditDate, formatDayOfWeek } from 'src/utils/dateFormatting';
import type { AuditHistoryItem, AuditProcessKey } from 'src/types/audit';

const processDefinitions: Array<{ key: AuditProcessKey; label: string }> = [
  { key: 'frontEnd', label: 'Front End' },
  { key: 'lavadora', label: 'Lavadora' },
  { key: 'printer', label: 'Printer' },
  { key: 'necker', label: 'Necker' },
  { key: 'insideSpray', label: 'Inside Spray' },
  { key: 'paletizadora', label: 'Paletizadora' },
];

const auditStore = useAuditStore();
const auditHistory = computed(() => auditStore.auditHistory ?? []);
const historyLoading = computed(() => auditStore.historyLoading ?? false);
const historyError = computed(() => auditStore.historyError ?? null);
const isDetailsDialogOpen = ref(false);
const selectedAudit = ref<AuditHistoryItem | null>(null);

function getSummaryText(failedProcesses: number, totalProcesses: number): string {
  if (failedProcesses === 0) {
    return `${totalProcesses} / ${totalProcesses} processos atualizados`;
  }

  const updatedProcesses = Math.max(totalProcesses - failedProcesses, 0);
  return `${updatedProcesses} atualizados, ${failedProcesses} com problemas`;
}

function openAuditDetails(audit: AuditHistoryItem) {
  selectedAudit.value = audit;
  isDetailsDialogOpen.value = true;
}

onMounted(() => {
  if (typeof auditStore.loadAuditHistory === 'function') {
    void auditStore.loadAuditHistory();
  }
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
</style>
