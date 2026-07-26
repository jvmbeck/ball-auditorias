<template>
  <q-card flat bordered class="checklist-card">
    <q-card-section>
      <div class="header">
        <q-icon name="task_alt" size="28px" color="secondary" class="q-mr-sm" />
        <span class="title">Auditoria diária de 5S</span>
      </div>

      <p class="description">
        Selecione os processos que deseja avaliar hoje e aplique notas 1, 3 ou 5 para cada área.
      </p>

      <q-btn
        unelevated
        color="secondary"
        icon-right="arrow_forward"
        label="Começar auditoria 5S"
        size="md"
        :to="{ name: 'daily5s-audit-page' }"
        class="full-width"
      />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts"></script>

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
  font-size: 0.8rem;
  margin: 0;
  min-height: 42px;
}

.status-row {
  display: flex;
  align-items: center;
}
</style>
