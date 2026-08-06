<template>
  <q-page padding class="gradient-background">
    <div class="page-shell">
      <section class="hero-card q-mb-lg">
        <div class="hero-copy">
          <p class="eyebrow">Planos de Ação</p>
          <h1 class="page-title">Tabela de Planos de Ação</h1>
          <p class="page-subtitle">
            Visualize os planos de ação por data, com a possibilidade de concluir planos pendentes.
          </p>
        </div>
      </section>

      <div class="q-mb-lg">
        <q-input
          v-model="selectedDate"
          type="date"
          outlined
          dense
          label="Data da auditoria"
          :disable="loading || completingPlanId !== null"
          @update:model-value="handleDateChange"
        />
      </div>

      <q-banner v-if="pageError" class="bg-red-1 text-negative q-mb-md" rounded>
        {{ pageError }}

        <template #action>
          <q-btn flat color="negative" label="Tentar novamente" @click="loadActionPlans" />
        </template>
      </q-banner>

      <action-plans-table
        :plans="plans"
        :loading="loading"
        :completing-plan-id="completingPlanId"
        @complete="handleCompleteActionPlan"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';

import ActionPlansTable from 'src/components/actionPlans/ActionPlansTable.vue';
import {
  completeActionPlan,
  getActionPlansByDate,
} from 'src/services/actionPlans/actionPlansService';
import type { ActionPlan } from 'src/types/actionPlans';

const $q = useQuasar();

const selectedDate = ref(getTodayDateKey());
const plans = ref<ActionPlan[]>([]);
const loading = ref(false);
const completingPlanId = ref<string | null>(null);
const pageError = ref<string | null>(null);

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function loadActionPlans(): Promise<void> {
  if (!selectedDate.value) {
    plans.value = [];
    return;
  }

  loading.value = true;
  pageError.value = null;

  try {
    plans.value = await getActionPlansByDate(selectedDate.value);
  } catch (error: unknown) {
    plans.value = [];

    pageError.value =
      error instanceof Error ? error.message : 'Não foi possível carregar os planos de ação.';
  } finally {
    loading.value = false;
  }
}

async function handleDateChange(value: string | number | null): Promise<void> {
  if (typeof value !== 'string' || !value) {
    plans.value = [];
    return;
  }

  await loadActionPlans();
}

async function handleCompleteActionPlan(actionPlanId: string): Promise<void> {
  const plan = plans.value.find((candidate) => candidate.id === actionPlanId);

  if (!plan || plan.status === 'Concluído') {
    return;
  }

  completingPlanId.value = actionPlanId;
  pageError.value = null;

  try {
    await completeActionPlan(actionPlanId);

    /*
     * Update the local row instead of querying Firestore again.
     * This avoids an unnecessary batch of reads.
     */
    plan.status = 'Concluído';
    plan.completedAt = null;

    $q.notify({
      type: 'positive',
      message: `Plano de ${plan.processName} concluído.`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível concluir o plano de ação.';

    pageError.value = message;

    $q.notify({
      type: 'negative',
      message,
    });
  } finally {
    completingPlanId.value = null;
  }
}

onMounted(() => {
  void loadActionPlans();
});
</script>
