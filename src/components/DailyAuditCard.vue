<template>
  <q-card flat bordered class="daily-audit-card">
    <q-card-section class="card-content">
      <!-- Completed -->
      <template v-if="todaysDraft?.completed">
        <div class="content-stack">
          <div class="resume-header">
            <q-icon name="fact_check" size="28px" color="positive" class="q-mr-sm" />
            <span class="resume-title" style="color: var(--q-positive)">Checklist e Quadros</span>
          </div>

          <div class="progress-row">
            <span class="progress-label">
              Todos os {{ TOTAL_PROCESSES }} processos revisados e enviados
            </span>
          </div>
        </div>

        <div class="status-row">
          <q-chip dense color="positive" text-color="white" icon="task_alt">Concluída</q-chip>
        </div>
        <q-btn
          unelevated
          color="positive"
          icon-right="history"
          label="Ver Histórico de Auditoria"
          size="md"
          :to="{ name: 'audit-history' }"
          class="full-width cta-btn"
        />
      </template>

      <!-- In progress -->
      <template v-else-if="todaysDraft">
        <div class="content-stack">
          <div class="resume-header">
            <q-icon name="fact_check" size="28px" color="primary" class="q-mr-sm" />
            <span class="resume-title">Checklists e Quadros</span>
          </div>

          <div class="progress-row">
            <span class="progress-label"> Auditoria iniciada e em andamento </span>
          </div>
        </div>
        <div class="status-row">
          <q-chip dense color="primary" text-color="white" icon="pending_actions"
            >Em andamento</q-chip
          >
        </div>
        <q-btn
          unelevated
          color="primary"
          icon-right="arrow_forward"
          label="Continuar Auditoria"
          size="md"
          to="/audits"
          class="full-width cta-btn"
        />
      </template>

      <!-- Not started -->
      <template v-else>
        <div class="content-stack">
          <div class="start-header">
            <q-icon name="fact_check" size="28px" color="positive" class="q-mr-sm" />
            <span class="start-title">Checklists e Quadros</span>
          </div>

          <p class="start-hint">
            Inicie uma nova auditoria para revisar todos os processos de produção.
          </p>
        </div>
        <div class="status-row">
          <q-chip dense color="grey-3" text-color="grey-8" icon="schedule"
            >Ainda não iniciada</q-chip
          >
        </div>
        <q-btn
          unelevated
          color="positive"
          icon-right="arrow_forward"
          label="Iniciar Auditoria"
          size="md"
          to="/audits"
          class="full-width cta-btn"
        />
      </template>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { checkTodaysAudit } from 'src/services/audit/auditResults';

const TOTAL_PROCESSES = 6;

const todaysDraft = ref<{
  auditId: string;
  turma: 'A e C' | 'B e D' | null;
  completed: boolean;
} | null>(null);

onMounted(async () => {
  todaysDraft.value = await checkTodaysAudit();
});
</script>

<style scoped>
.daily-audit-card {
  height: 100%;
  border-radius: 24px;
  background: white;
  box-shadow: 0 18px 48px rgba(29, 49, 57, 0.08);
}

.card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 200px;
  gap: 1rem;
}

.content-stack {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.cta-btn {
  margin-top: auto;
}

.resume-header,
.start-header {
  display: flex;
  align-items: center;
}

.resume-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #17343d;
}

.start-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #17343d;
}

.progress-label {
  font-size: 0.9rem;
  color: #5f7077;
}

.start-hint {
  color: #5f7077;
  font-size: 0.95rem;
  margin: 0;
}

.status-row {
  display: flex;
  align-items: center;
}
</style>
