<template>
  <q-table
    :rows="plans"
    :columns="columns"
    row-key="id"
    flat
    bordered
    :loading="loading"
    :pagination="{ rowsPerPage: 0 }"
    :rows-per-page-options="[0]"
    no-data-label="Nenhum plano de ação encontrado para esta data."
    loading-label="Carregando planos de ação..."
  >
    <template #body-cell-status="props">
      <q-td :props="props">
        <q-badge :color="getStatusColor(props.row.status)">
          {{ props.row.status }}
        </q-badge>
      </q-td>
    </template>

    <template #body-cell-actions="props">
      <q-td :props="props" class="text-center">
        <q-btn
          v-if="canComplete(props.row)"
          icon="check"
          color="positive"
          round
          dense
          :loading="completingPlanId === props.row.id"
          :disable="completingPlanId !== null && completingPlanId !== props.row.id"
          @click="emit('complete', props.row.id)"
        >
          <q-tooltip>Concluir plano de ação</q-tooltip>
        </q-btn>

        <q-icon
          v-else-if="props.row.status === 'Concluído'"
          name="task_alt"
          color="positive"
          size="sm"
        >
          <q-tooltip>Plano concluído</q-tooltip>
        </q-icon>

        <span v-else class="text-grey-7"> — </span>
      </q-td>
    </template>
  </q-table>
</template>

<script setup lang="ts">
import type { QTableColumn } from 'quasar';
import type { ActionPlan, ActionPlanStatus } from 'src/types/actionPlans';

defineProps<{
  plans: ActionPlan[];
  loading: boolean;
  completingPlanId: string | null;
}>();

const emit = defineEmits<{
  complete: [actionPlanId: string];
}>();

const columns: QTableColumn<ActionPlan>[] = [
  {
    name: 'processName',
    label: 'Processo',
    field: 'processName',
    align: 'left',
    sortable: true,
  },
  {
    name: 'reason',
    label: 'Problema',
    field: 'reason',
    align: 'left',
    sortable: true,
  },
  {
    name: 'owner',
    label: 'Responsável',
    field: 'owner',
    align: 'left',
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    align: 'center',
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Ações',
    field: () => null,
    align: 'center',
  },
];

function canComplete(plan: ActionPlan): boolean {
  return plan.status === 'Aberto';
}

function getStatusColor(status: ActionPlanStatus): string {
  switch (status) {
    case 'Aberto':
      return 'negative';

    case 'Concluído':
      return 'positive';

    case 'Cancelado':
      return 'grey';

    default:
      return 'grey';
  }
}
</script>
