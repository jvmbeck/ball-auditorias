<template>
  <q-dialog v-model="isOpen">
    <q-card class="daily5s-info-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div>
          <div class="text-overline">Guia de Pontuacao 5S</div>
          <div class="text-h6">{{ processLabel }}</div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense @click="isOpen = false" />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <q-list bordered separator class="rounded-borders">
          <q-item>
            <q-item-section side>
              <q-chip color="negative" text-color="white" dense>1</q-chip>
            </q-item-section>
            <q-item-section>
              <q-item-label class="score-title">Nota 1</q-item-label>
              <q-item-label caption>{{ guidance[1] }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section side>
              <q-chip color="warning" text-color="black" dense>3</q-chip>
            </q-item-section>
            <q-item-section>
              <q-item-label class="score-title">Nota 3</q-item-label>
              <q-item-label caption>{{ guidance[3] }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section side>
              <q-chip color="positive" text-color="white" dense>5</q-chip>
            </q-item-section>
            <q-item-section>
              <q-item-label class="score-title">Nota 5</q-item-label>
              <q-item-label caption>{{ guidance[5] }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  processLabel: string;
  guidance: {
    1: string;
    3: string;
    5: string;
  };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});
</script>

<style scoped>
.daily5s-info-dialog {
  width: min(720px, 94vw);
  border-radius: 18px;
}

.score-title {
  font-weight: 700;
  color: #17343d;
}
</style>
