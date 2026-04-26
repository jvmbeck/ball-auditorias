<template>
  <q-card flat bordered class="checklist-card">
    <q-card-section>
      <div class="header q-mb-md">
        <q-icon name="checklist" size="28px" color="secondary" class="q-mr-sm" />
        <span class="title">Checklist 5S</span>
      </div>

      <p class="description q-mb-md">
        Simula o fluxo 5S com um formulário dedicado para os processos de produção.
      </p>

      <div class="status-row q-mb-md">
        <q-chip dense color="grey-3" text-color="grey-8" icon="schedule">Em breve</q-chip>
      </div>

      <q-btn
        unelevated
        color="secondary"
        icon-right="arrow_forward"
        label="Começar Checklist 5S"
        size="md"
        class="full-width"
        @click="handlePlaceholderAction"
      />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
function handlePlaceholderAction() {
  // Placeholder action: intentionally does nothing for now.
}
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
