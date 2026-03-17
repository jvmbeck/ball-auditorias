<template>
  <q-page class="audit-page q-pa-md q-pa-lg-xl">
    <div class="page-shell">
      <section class="hero-card q-mb-lg">
        <div class="hero-copy">
          <p class="eyebrow">Factory Audit</p>
          <h1 class="page-title">Process Inspection</h1>
          <p class="page-subtitle">
            Review each process in any order, record issues with evidence, and submit everything
            together when the audit is complete.
          </p>
        </div>

        <div class="hero-stats">
          <q-select
            v-model="turma"
            outlined
            dense
            emit-value
            map-options
            options-dense
            :options="turmaOptions"
            label="Turma responsável"
            class="turma-select"
          />

          <q-chip color="primary" text-color="white" icon="assignment_turned_in">
            {{ completedCount }} / {{ processDefinitions.length }} processes completed
          </q-chip>
        </div>

        <q-linear-progress
          rounded
          size="12px"
          color="positive"
          track-color="grey-3"
          :value="completedCount / processDefinitions.length"
        />
      </section>

      <q-banner
        v-if="pageError || error"
        rounded
        class="q-mb-lg bg-negative text-white"
        inline-actions
      >
        {{ pageError || error }}
      </q-banner>

      <div class="row q-col-gutter-lg">
        <div
          v-for="process in processDefinitions"
          :key="process.key"
          class="col-12 col-md-6 col-xl-4"
        >
          <q-card
            flat
            bordered
            class="process-card full-height"
            :class="{ 'process-card-disabled': !canFillAudit }"
          >
            <q-card-section class="row items-start justify-between q-gutter-sm">
              <div>
                <div class="process-label">{{ process.label }}</div>
                <div class="process-hint">
                  Select the outcome now. Everything will be saved together when you finish the
                  audit.
                </div>
              </div>

              <q-chip dense :color="getProcessChip(process.key).color" text-color="white">
                {{ getProcessChip(process.key).label }}
              </q-chip>
            </q-card-section>

            <q-card-section>
              <q-option-group
                v-model="processState[process.key].status"
                :options="statusOptions"
                color="primary"
                type="radio"
                inline
                :disable="!canFillAudit"
                @update:model-value="onStatusChange(process.key)"
              />

              <div v-if="processState[process.key].status === 'not_updated'" class="q-mt-md">
                <q-input
                  v-model="processState[process.key].comment"
                  autogrow
                  outlined
                  type="textarea"
                  label="Explain the issue"
                  class="q-mb-md"
                  :disable="!canFillAudit"
                />

                <q-file
                  v-model="processFiles[process.key]"
                  outlined
                  clearable
                  accept="image/*"
                  label="Upload evidence photo"
                  bottom-slots
                  :disable="!canFillAudit"
                >
                  <template #prepend>
                    <q-icon name="photo_camera" />
                  </template>
                </q-file>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <section class="footer-actions q-mt-xl">
        <q-btn
          size="lg"
          color="positive"
          unelevated
          label="Finish Audit"
          :disable="!allProcessesCompleted || !allProcessesValid || !auditId || isBusy"
          :loading="isFinishing"
          @click="finishAudit"
        />
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useAuditStore } from 'src/stores/audit.store';
import type { AuditProcessKey } from 'src/types/audit';

const processDefinitions: Array<{ key: AuditProcessKey; label: string }> = [
  { key: 'frontEnd', label: 'Front End' },
  { key: 'lavadora', label: 'Lavadora' },
  { key: 'printer', label: 'Printer' },
  { key: 'necker', label: 'Necker' },
  { key: 'insideSpray', label: 'Inside Spray' },
  { key: 'paletizadora', label: 'Paletizadora' },
];

const statusOptions = [
  { label: 'Updated', value: 'updated' },
  { label: 'Issue Found', value: 'not_updated' },
];

const turmaOptions: Array<{ label: string; value: 'A' | 'B' | 'C' | 'D' }> = [
  { label: 'Turma A', value: 'A' },
  { label: 'Turma B', value: 'B' },
  { label: 'Turma C', value: 'C' },
  { label: 'Turma D', value: 'D' },
];

const $q = useQuasar();
const router = useRouter();
const auditStore = useAuditStore();

const {
  auditId,
  processState,
  processFiles,
  loading,
  error,
  completedCount,
  allProcessesCompleted,
} = storeToRefs(auditStore);

const turma = computed<'A' | 'B' | 'C' | 'D' | null>({
  get: () => auditStore.turma ?? null,
  set: (value) => {
    if (typeof auditStore.setTurma === 'function') {
      void auditStore.setTurma(value);
    }
  },
});

const isFinishing = ref(false);
const pageError = ref<string | null>(null);

const isBusy = computed(() => loading.value || isFinishing.value);
const canFillAudit = computed(() => Boolean(auditId.value && turma.value));

function getProcessChip(processKey: AuditProcessKey) {
  const status = processState.value[processKey].status;

  if (status === 'updated') {
    return { label: 'Updated', color: 'positive' };
  }

  if (status === 'not_updated') {
    return { label: 'Issue Found', color: 'negative' };
  }

  return { label: 'Not Started', color: 'grey-6' };
}

function isProcessValid(processKey: AuditProcessKey) {
  const { status, comment } = processState.value[processKey];
  const file = processFiles.value[processKey];

  if (status === null) {
    return false;
  }

  if (status === 'updated') {
    return true;
  }

  return Boolean(comment.trim()) && Boolean(file);
}

const allProcessesValid = computed(() =>
  processDefinitions.every((process) => isProcessValid(process.key)),
);

function onStatusChange(processKey: AuditProcessKey) {
  if (processState.value[processKey].status === 'updated') {
    processState.value[processKey].comment = '';
    processFiles.value[processKey] = null;
  }
}

async function ensureAuditSession() {
  if (auditId.value || !turma.value) {
    return;
  }

  try {
    await auditStore.startAudit(turma.value);
  } catch (err: unknown) {
    pageError.value = err instanceof Error ? err.message : String(err);
  }
}

async function finishAudit() {
  if (!allProcessesCompleted.value || !allProcessesValid.value || !auditId.value) {
    return;
  }

  isFinishing.value = true;
  pageError.value = null;

  try {
    await auditStore.finishAudit();
    $q.notify({ type: 'positive', message: 'Audit completed successfully.' });
    await router.push({ name: 'audit-history' });
  } catch (err: unknown) {
    pageError.value = err instanceof Error ? err.message : String(err);
  } finally {
    isFinishing.value = false;
  }
}

onMounted(() => {
  const draft = auditStore.checkTodaysDraft();

  if (draft?.turma && !turma.value) {
    void auditStore.setTurma(draft.turma);
  }

  void ensureAuditSession();
});

watch(turma, () => {
  pageError.value = null;
  void ensureAuditSession();
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

.hero-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 18px 0 20px;
}

.turma-select {
  min-width: 220px;
}

.turma-select :deep(.q-field__native),
.turma-select :deep(.q-field__label),
.turma-select :deep(.q-field__marginal),
.turma-select :deep(.q-icon) {
  color: white;
}

.turma-select :deep(.q-field__control) {
  background: rgba(255, 255, 255, 0.08);
}

.process-card {
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 38px rgba(29, 49, 57, 0.08);
}

.process-card-disabled {
  opacity: 0.6;
}

.process-label {
  font-size: 1.2rem;
  font-weight: 700;
  color: #17343d;
}

.process-hint {
  margin-top: 4px;
  color: #5f7077;
  font-size: 0.92rem;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 599px) {
  .hero-card {
    padding: 20px;
    border-radius: 22px;
  }

  .footer-actions {
    justify-content: stretch;
  }

  .footer-actions :deep(.q-btn) {
    width: 100%;
  }
}
</style>
