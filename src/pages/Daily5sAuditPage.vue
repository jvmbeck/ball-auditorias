<template>
  <q-page class="audit-page q-pa-md q-pa-lg-xl">
    <div class="page-shell">
      <section class="hero-card q-mb-lg">
        <div class="hero-copy">
          <p class="eyebrow">Daily 5S</p>
          <h1 class="page-title">Auditoria Daily 5S</h1>
          <p class="page-subtitle">
            Escolha os processos que deseja avaliar hoje e atribua nota 1, 3 ou 5 para cada area.
            Nota 1 exige justificativa com descricao e foto.
          </p>
        </div>
      </section>

      <section class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-md-4">
          <q-select
            v-model="selectedTurma"
            outlined
            dense
            emit-value
            map-options
            options-dense
            :options="turmaOptions"
            label="Turma responsavel"
          />
        </div>

        <div class="col-12 col-md-8">
          <q-select
            :model-value="selectedProcesses"
            multiple
            outlined
            dense
            emit-value
            map-options
            use-chips
            :options="processOptions"
            label="Selecione os processos da auditoria"
            @update:model-value="onSelectedProcessesChange"
          />
        </div>
      </section>

      <section class="progress-card q-mb-lg">
        <div class="progress-header">
          <h3 class="progress-title">Progresso Daily 5S</h3>
          <q-chip color="primary" text-color="white" icon="assignment_turned_in">
            {{ ratedCount }} / {{ selectedCount }} processos avaliados
          </q-chip>
        </div>

        <q-linear-progress
          rounded
          size="12px"
          color="positive"
          track-color="grey-3"
          :value="selectedCount ? ratedCount / selectedCount : 0"
        />
      </section>

      <q-banner v-if="pageError" rounded class="q-mb-md bg-negative text-white" inline-actions>
        {{ pageError }}
      </q-banner>

      <div v-if="!selectedCount" class="empty-selection q-pa-lg q-mb-lg">
        <q-icon name="playlist_add" size="36px" color="primary" />
        <p class="empty-text">Selecione pelo menos um processo para iniciar a avaliacao.</p>
      </div>

      <div v-else class="row q-col-gutter-lg q-mb-xl">
        <div
          v-for="process in selectedProcessDefinitions"
          :key="process.key"
          class="col-12 col-md-6 col-xl-4"
          :class="{ 'process-card-disabled': !selectedTurma }"
        >
          <Daily5sProcessCard
            :process-key="process.key"
            :label="process.label"
            :guidance="process.guidance"
            :model-value="processState[process.key]"
            :file="processFiles[process.key]"
            :is-saved="savedProcesses[process.key]"
            :loading="loading"
            @update:model-value="processState[process.key] = $event"
            @update:file="processFiles[process.key] = $event"
            @update:is-saved="savedProcesses[process.key] = $event"
            @save="saveCurrentProcess(process.key)"
          />
        </div>
      </div>

      <section class="q-mb-lg">
        <Daily5sRatedProcessesCard :refresh-token="ratedProcessesRefreshToken" />
      </section>

      <section class="footer-actions">
        <q-btn
          size="lg"
          color="positive"
          unelevated
          label="Finalizar Auditoria Daily 5S"
          :disable="!selectedTurma || !allSelectedValid || isBusy"
          :loading="loading"
          @click="finishAudit"
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
import Daily5sProcessCard from 'src/components/Daily5sProcessCard.vue';
import Daily5sRatedProcessesCard from 'src/components/Daily5sRatedProcessesCard.vue';
import { DAILY5S_PROCESS_DEFINITIONS } from 'src/services/audit';
import { useDaily5sAuditStore } from 'src/stores/daily5sAudit.store';
import type { Daily5sAuditProcessKey } from 'src/types/audit';

const $q = useQuasar();
const router = useRouter();
const daily5sStore = useDaily5sAuditStore();

const {
  turma,
  selectedProcessKeys,
  processState,
  processFiles,
  savedProcesses,
  loading,
  allSelectedValid,
  selectedCount,
  ratedCount,
} = storeToRefs(daily5sStore);

const pageError = ref<string | null>(null);
const ratedProcessesRefreshToken = ref(0);

const turmaOptions: Array<{ label: string; value: 'A e C' | 'B e D' }> = [
  { label: 'A e C', value: 'A e C' },
  { label: 'B e D', value: 'B e D' },
];

const selectedTurma = computed<'A e C' | 'B e D' | null>({
  get: () => turma.value,
  set: (value) => daily5sStore.setTurma(value),
});

const processOptions = computed(() =>
  DAILY5S_PROCESS_DEFINITIONS.map((process) => ({
    label: process.label,
    value: process.key,
  })),
);

const selectedProcesses = computed(() => selectedProcessKeys.value);

const selectedProcessDefinitions = computed(() =>
  DAILY5S_PROCESS_DEFINITIONS.filter((process) => selectedProcessKeys.value.includes(process.key)),
);

const isBusy = computed(() => loading.value);

function onSelectedProcessesChange(keys: Daily5sAuditProcessKey[]) {
  daily5sStore.setSelectedProcesses(keys);
}

async function saveCurrentProcess(processKey: Daily5sAuditProcessKey): Promise<void> {
  pageError.value = null;

  try {
    await daily5sStore.saveProcess(processKey);
    ratedProcessesRefreshToken.value += 1;
    $q.notify({
      type: 'positive',
      message: `Processo ${processKey} salvo com sucesso.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Nao foi possivel salvar o processo.';
    pageError.value = message;
    $q.notify({ type: 'negative', message });
  }
}

async function finishAudit() {
  pageError.value = null;

  try {
    await daily5sStore.finishAudit();
    $q.notify({ type: 'positive', message: 'Auditoria Daily 5S concluida com sucesso.' });
    await router.push({ name: 'audit-history' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    pageError.value = message;
    $q.notify({ type: 'negative', message });
  }
}

onMounted(async () => {
  try {
    await daily5sStore.initialize();

    if (daily5sStore.consumeDayRolloverNotice()) {
      $q.notify({
        type: 'info',
        message: 'Rascunho anterior encerrado. Inicie a auditoria Daily 5S de hoje.',
      });
    }
  } catch (err: unknown) {
    pageError.value = err instanceof Error ? err.message : String(err);
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
  margin-bottom: 12px;
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
  max-width: 760px;
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

.empty-selection {
  border-radius: 20px;
  border: 1px dashed #96a9b0;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  gap: 12px;
}

.empty-text {
  margin: 0;
  color: #4d626a;
  font-size: 0.95rem;
}

.process-card-disabled {
  opacity: 0.6;
  pointer-events: none;
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
