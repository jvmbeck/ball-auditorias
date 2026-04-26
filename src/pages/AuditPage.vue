<template>
  <q-page class="audit-page q-pa-md q-pa-lg-xl">
    <div class="page-shell">
      <section class="hero-card q-mb-lg">
        <div class="hero-copy">
          <p class="eyebrow">Auditoria RTO e 5S</p>
          <h1 class="page-title">Inspeção de Processos Dupla</h1>
          <p class="page-subtitle">
            Complete ambas as auditorias RTO e 5S. Revise cada processo, registre problemas com
            evidências e envie tudo junto.
          </p>
        </div>
      </section>

      <q-banner
        v-if="pageError || error"
        rounded
        class="q-mb-lg bg-negative text-white"
        inline-actions
      >
        {{ pageError || error }}
      </q-banner>

      <!-- Audit Tabs -->
      <q-tabs
        v-model="selectedAuditType"
        dense
        class="text-primary q-mb-lg"
        active-color="primary"
        indicator-color="primary"
      >
        <q-tab name="rto" label="RTO">
          <template #default>
            <div class="tab-label-content">
              <span>RTO</span>
              <q-chip
                size="sm"
                color="primary"
                text-color="white"
                :label="`${checklistCompletedCount} / ${rtoProcessDefinitions.length}`"
              />
            </div>
          </template>
        </q-tab>

        <q-tab name="board5s" label="Board 5S">
          <template #default>
            <div class="tab-label-content">
              <span>Board (5S)</span>
              <q-chip
                size="sm"
                color="primary"
                text-color="white"
                :label="`${boardCompletedCount} / ${board5sProcessDefinitions.length}`"
              />
            </div>
          </template>
        </q-tab>
      </q-tabs>

      <!-- Progress Card for Current Tab -->
      <section class="progress-card q-mb-lg">
        <div class="progress-header">
          <h3 class="progress-title">
            {{ selectedAuditType === 'rto' ? 'RTO' : 'Board (5S)' }} Progresso
          </h3>
          <q-chip
            color="primary"
            text-color="white"
            icon="assignment_turned_in"
            :label="`${currentCompletedCount} / ${currentTotalProcesses} processos completos`"
          />
        </div>
        <q-linear-progress
          rounded
          size="12px"
          color="positive"
          track-color="grey-3"
          :value="currentCompletedCount / currentTotalProcesses"
        />
      </section>

      <!-- Process Cards Grid -->
      <div class="row q-col-gutter-lg q-mb-xl">
        <div
          v-for="process in selectedAuditType === 'rto'
            ? rtoProcessDefinitions
            : board5sProcessDefinitions"
          :key="process.key"
          class="col-12 col-md-6 col-xl-4"
          :class="{ 'process-card-disabled': !auditStarted }"
        >
          <ProcessCard
            :process-key="process.key"
            :label="process.label"
            :model-value="
              selectedAuditType === 'rto'
                ? checklistProcessState[process.key as RtoAuditProcessKey]
                : boardProcessState[process.key as Board5sAuditProcessKey]
            "
            :file="
              selectedAuditType === 'rto'
                ? checklistProcessFiles[process.key as RtoAuditProcessKey]
                : boardProcessFiles[process.key as Board5sAuditProcessKey]
            "
            :loading="loading"
            @update:model-value="
              selectedAuditType === 'rto'
                ? (checklistProcessState[process.key as RtoAuditProcessKey] = $event)
                : (boardProcessState[process.key as Board5sAuditProcessKey] = $event)
            "
            @update:file="
              selectedAuditType === 'rto'
                ? (checklistProcessFiles[process.key as RtoAuditProcessKey] = $event)
                : (boardProcessFiles[process.key as Board5sAuditProcessKey] = $event)
            "
            @save="saveCurrentProcess(process.key)"
          />
        </div>
      </div>

      <!-- Finish Button -->
      <section class="footer-actions">
        <q-btn
          size="lg"
          color="positive"
          unelevated
          label="Finalizar Ambas as Auditorias"
          :disable="!allComplete || !allProcessesValid || isBusy"
          :loading="isFinishing"
          @click="finishAudits"
        />
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useDualAuditStore } from 'src/stores/dualAudit.store';
import ProcessCard from 'src/components/ProcessCard.vue';
import type {
  AuditType,
  Board5sAuditProcessKey,
  DualAuditProcessKey,
  RtoAuditProcessKey,
} from 'src/types/audit';

const rtoProcessDefinitions: Array<{ key: RtoAuditProcessKey; label: string }> = [
  { key: 'frontEnd', label: 'Front End' },
  { key: 'lavadora', label: 'Lavadora' },
  { key: 'printer', label: 'Printer' },
  { key: 'necker', label: 'Necker' },
  { key: 'insideSpray', label: 'Inside Spray' },
  { key: 'paletizadora', label: 'Paletizadora' },
];

const board5sProcessDefinitions: Array<{ key: Board5sAuditProcessKey; label: string }> = [
  { key: 'minsters', label: 'Minsters' },
  { key: 'bodyMakers11to14', label: 'Body Makers 11 a 14' },
  { key: 'bodyMakers15to18', label: 'Body Makers 15 a 18' },
  { key: 'bodyMakers19to23', label: 'Body Makers 19 a 23' },
  { key: 'bodyMakers24to31', label: 'Body Makers 24 a 31' },
  { key: 'printer1', label: 'Printer 1' },
  { key: 'printer2e3', label: 'Printer 2 e 3' },
];

const $q = useQuasar();
const router = useRouter();
const auditStore = useDualAuditStore();

const {
  checklistAuditId,
  boardAuditId,
  checklistProcessState,
  boardProcessState,
  checklistProcessFiles,
  boardProcessFiles,
  loading,
  error,
  checklistCompletedCount,
  boardCompletedCount,
  allComplete,
} = storeToRefs(auditStore);

const selectedAuditType = ref<AuditType>('rto');
const isFinishing = ref(false);
const pageError = ref<string | null>(null);

const auditStarted = computed(() => checklistAuditId.value !== null && boardAuditId.value !== null);

const isBusy = computed(() => loading.value || isFinishing.value);

const currentCompletedCount = computed(() =>
  selectedAuditType.value === 'rto' ? checklistCompletedCount.value : boardCompletedCount.value,
);

const currentTotalProcesses = computed(() =>
  selectedAuditType.value === 'rto'
    ? rtoProcessDefinitions.length
    : board5sProcessDefinitions.length,
);

function isRtoProcessValid(processKey: RtoAuditProcessKey): boolean {
  const { status, comment } = checklistProcessState.value[processKey];
  const file = checklistProcessFiles.value[processKey];

  if (status === null) return false;
  if (status === 'updated') return true;

  return Boolean(comment.trim()) && Boolean(file);
}

function isBoard5sProcessValid(processKey: Board5sAuditProcessKey): boolean {
  const { status, comment } = boardProcessState.value[processKey];
  const file = boardProcessFiles.value[processKey];

  if (status === null) return false;
  if (status === 'updated') return true;

  return Boolean(comment.trim()) && Boolean(file);
}

const allProcessesValid = computed(() =>
  selectedAuditType.value === 'rto'
    ? rtoProcessDefinitions.every((process) => isRtoProcessValid(process.key))
    : board5sProcessDefinitions.every((process) => isBoard5sProcessValid(process.key)),
);

async function saveCurrentProcess(processKey: DualAuditProcessKey): Promise<void> {
  await auditStore.saveProcess(selectedAuditType.value, processKey);
}

async function startAudits() {
  try {
    await auditStore.startAudits();
  } catch (err: unknown) {
    pageError.value = err instanceof Error ? err.message : String(err);
  }
}

async function finishAudits() {
  if (!allComplete.value || !allProcessesValid.value || !auditStarted.value) {
    return;
  }

  isFinishing.value = true;
  pageError.value = null;

  try {
    await auditStore.finishAudits();
    $q.notify({ type: 'positive', message: 'Ambas as auditorias concluídas com sucesso.' });
    await router.push({ name: 'audit-history' });
  } catch (err: unknown) {
    pageError.value = err instanceof Error ? err.message : String(err);
  } finally {
    isFinishing.value = false;
  }
}

onMounted(async () => {
  const draft = auditStore.checkTodaysDraft();
  if (!draft || !auditStarted.value) {
    await startAudits();
  }
});
</script>

<style scoped>
.audit-page {
  background:
    radial-gradient(circle at top right, rgba(18, 158, 123, 0.14), transparent 28%),
    linear-gradient(180deg, #f6f8f7 0%, #eef3f1 100%);
}

.page-shell {
  max-width: 1320px;
  margin: 0 auto;
}

.hero-card {
  padding: 24px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(12, 55, 64, 0.96), rgba(20, 102, 87, 0.92)), #163d47;
  color: white;
  box-shadow: 0 24px 60px rgba(21, 48, 58, 0.18);
}

.hero-copy {
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.78rem;
  opacity: 0.72;
}

.page-title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.6rem);
  line-height: 1;
  font-weight: 800;
}

.page-subtitle {
  max-width: 720px;
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.84);
  font-size: 1rem;
}

.progress-card {
  padding: 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 24px rgba(29, 49, 57, 0.08);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.progress-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #17343d;
}

.tab-label-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.process-card-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 599px) {
  .hero-card {
    padding: 20px;
    border-radius: 22px;
  }

  .progress-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .footer-actions {
    justify-content: stretch;
  }

  .footer-actions :deep(.q-btn) {
    width: 100%;
  }
}
</style>
