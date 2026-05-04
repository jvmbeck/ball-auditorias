<template>
  <q-card flat bordered class="rated-card">
    <q-card-section>
      <div class="header q-mb-sm">
        <q-icon name="fact_check" size="24px" color="primary" class="q-mr-sm" />
        <div>
          <div class="title">Processos Avaliados Hoje</div>
          <div class="subtitle">Lista de processos ja registrados no Daily 5S.</div>
        </div>
      </div>

      <div v-if="loading" class="state-box">
        <q-spinner color="primary" size="24px" />
        <span>Carregando processos...</span>
      </div>

      <div v-else-if="!ratedProcesses.length" class="state-box">
        <q-icon name="schedule" size="20px" color="grey-7" />
        <span>Nenhum processo avaliado hoje.</span>
      </div>

      <div v-else class="list-shell">
        <q-list dense separator>
          <q-item v-for="process in ratedProcesses" :key="process.key">
            <q-item-section avatar>
              <q-icon name="check_circle" color="positive" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ process.label }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useAuthStore } from 'src/stores/auth.store';
import { DAILY5S_PROCESS_LABELS, getTodaysDaily5sStatus } from 'src/services/audit';
import type { Daily5sAuditProcessKey } from 'src/types/audit';

const props = withDefaults(
  defineProps<{
    refreshToken?: number;
  }>(),
  {
    refreshToken: 0,
  },
);

const authStore = useAuthStore();
const loading = ref(false);
const ratedProcesses = ref<Array<{ key: Daily5sAuditProcessKey; label: string }>>([]);

async function loadRatedProcesses() {
  const inspectorId = authStore.firebaseUser?.uid;
  if (!inspectorId) {
    ratedProcesses.value = [];
    return;
  }

  loading.value = true;

  try {
    const status = await getTodaysDaily5sStatus(inspectorId);
    if (!status) {
      ratedProcesses.value = [];
      return;
    }

    ratedProcesses.value = status.ratedProcessKeys.map((key) => ({
      key,
      label: DAILY5S_PROCESS_LABELS[key],
    }));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadRatedProcesses();
});

watch(
  () => props.refreshToken,
  () => {
    void loadRatedProcesses();
  },
);
</script>

<style scoped>
.rated-card {
  border-radius: 24px;
  background: white;
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

.list-shell {
  max-height: 190px;
  overflow-y: auto;
  border: 1px solid #e6ecef;
  border-radius: 12px;
}

.state-box {
  min-height: 86px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #5f7077;
}
</style>
