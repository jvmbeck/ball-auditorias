<template>
  <q-card flat bordered class="checklist-card">
    <q-card-section>
      <div class="header q-mb-md">
        <q-icon name="task_alt" size="28px" color="secondary" class="q-mr-sm" />
        <span class="title">Daily 5S</span>
      </div>

      <p class="description q-mb-md">
        Selecione os processos que deseja avaliar hoje e aplique notas 1, 3 ou 5 para cada area.
      </p>

      <div class="status-row q-mb-md">
        <q-chip
          v-if="todaysStatus?.completed"
          dense
          color="positive"
          text-color="white"
          icon="task_alt"
        >
          Concluida hoje
        </q-chip>
        <q-chip
          v-else-if="todaysStatus"
          dense
          color="primary"
          text-color="white"
          icon="pending_actions"
        >
          Em andamento
        </q-chip>
        <q-chip v-else dense color="grey-3" text-color="grey-8" icon="schedule">
          Nao iniciada hoje
        </q-chip>
      </div>

      <q-btn
        v-if="todaysStatus?.completed"
        unelevated
        color="secondary"
        icon-right="refresh"
        label="Nova Daily 5S"
        size="md"
        :to="{ name: 'daily5s-audit-page' }"
        class="full-width"
      />

      <q-btn
        v-else-if="todaysStatus"
        unelevated
        color="primary"
        icon-right="arrow_forward"
        label="Continuar Daily 5S"
        size="md"
        :to="{ name: 'daily5s-audit-page' }"
        class="full-width"
      />

      <q-btn
        v-else
        unelevated
        color="secondary"
        icon-right="arrow_forward"
        label="Iniciar Daily 5S"
        size="md"
        :to="{ name: 'daily5s-audit-page' }"
        class="full-width"
      />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getTodaysDaily5sStatus } from 'src/services/audit';
import { useAuthStore } from 'src/stores/auth.store';

const authStore = useAuthStore();

const todaysStatus = ref<{
  auditId: string;
  turma: 'A e C' | 'B e D' | null;
  completed: boolean;
  ratedProcessKeys: string[];
} | null>(null);

onMounted(async () => {
  const inspectorId = authStore.firebaseUser?.uid;
  if (!inspectorId) {
    todaysStatus.value = null;
    return;
  }

  todaysStatus.value = await getTodaysDaily5sStatus(inspectorId);
});
</script>

<style scoped>
.checklist-card {
  border-radius: 24px;
  background: white;
  box-shadow: 0 18px 48px rgba(29, 49, 57, 0.08);
}

.header {
  display: flex;
  align-items: center;
}

.title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #17343d;
}

.description {
  color: #5f7077;
  font-size: 0.95rem;
  margin: 0;
  min-height: 42px;
}

.status-row {
  display: flex;
  align-items: center;
}
</style>
