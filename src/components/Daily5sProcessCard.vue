<template>
  <q-card flat bordered class="process-card full-height">
    <q-card-section class="row items-start justify-between q-gutter-sm">
      <div>
        <div class="process-title-row">
          <div class="process-label">{{ label }}</div>
          <q-btn
            dense
            round
            flat
            size="sm"
            icon="info"
            color="primary"
            @click="isInfoOpen = true"
          >
            <q-tooltip anchor="top middle" self="bottom middle">Como pontuar esta area</q-tooltip>
          </q-btn>
          <q-icon
            v-if="isSaved && modelValue.rating !== null"
            name="check_circle"
            color="positive"
            size="24px"
          >
            <q-tooltip anchor="top middle" self="bottom middle">Processo salvo</q-tooltip>
          </q-icon>
        </div>

        <div class="process-hint">Selecione 1, 3 ou 5 e salve para registrar este processo.</div>
      </div>

      <q-chip dense :color="statusChip.color" text-color="white">{{ statusChip.label }}</q-chip>
    </q-card-section>

    <q-card-section>
      <q-btn-toggle
        :model-value="modelValue.rating"
        unelevated
        spread
        toggle-color="primary"
        color="grey-3"
        text-color="grey-9"
        :options="ratingOptions"
        @update:model-value="onRatingChange"
      />

      <div v-if="modelValue.rating === 1" class="q-mt-md">
        <q-banner dense rounded class="bg-red-1 text-red-9 q-mb-md">
          Nota 1 exige justificativa com descricao e imagem.
        </q-banner>

        <q-input
          :model-value="modelValue.comment"
          autogrow
          outlined
          type="textarea"
          label="Descreva o motivo da nota 1"
          class="q-mb-md"
          @update:model-value="onCommentChange"
        />

        <q-file
          :model-value="file"
          outlined
          clearable
          accept="image/*"
          label="Envie uma foto como evidencia"
          bottom-slots
          @update:model-value="onFileChange"
        >
          <template #prepend>
            <q-icon name="photo_camera" />
          </template>
        </q-file>
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-btn
        unelevated
        color="primary"
        label="Salvar"
        :disable="!isValid"
        :loading="loading"
        @click="emit('save')"
      />
    </q-card-section>

    <Daily5sInfoDialog
      v-model="isInfoOpen"
      :process-label="label"
      :guidance="guidance"
    />
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Daily5sRatingValue } from 'src/types/audit';
import Daily5sInfoDialog from './Daily5sInfoDialog.vue';

interface ProcessValue {
  rating: Daily5sRatingValue | null;
  comment: string;
}

const props = defineProps<{
  processKey: string;
  label: string;
  modelValue: ProcessValue;
  file: File | null;
  loading: boolean;
  isSaved: boolean;
  guidance: {
    1: string;
    3: string;
    5: string;
  };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ProcessValue];
  'update:file': [file: File | null];
  'update:isSaved': [isSaved: boolean];
  save: [];
}>();

const isInfoOpen = ref(false);

watch(
  () => props.modelValue,
  () => {
    if (props.isSaved) {
      emit('update:isSaved', false);
    }
  },
  { deep: true },
);

const ratingOptions: Array<{ label: string; value: Daily5sRatingValue }> = [
  { label: '1', value: 1 },
  { label: '3', value: 3 },
  { label: '5', value: 5 },
];

const statusChip = computed(() => {
  if (props.modelValue.rating === 1) {
    return { label: 'Nota 1', color: 'negative' };
  }

  if (props.modelValue.rating === 3) {
    return { label: 'Nota 3', color: 'warning' };
  }

  if (props.modelValue.rating === 5) {
    return { label: 'Nota 5', color: 'positive' };
  }

  return { label: 'Nao Avaliado', color: 'grey-6' };
});

const isValid = computed(() => {
  const { rating, comment } = props.modelValue;

  if (rating === null) {
    return false;
  }

  if (rating !== 1) {
    return true;
  }

  return Boolean(comment.trim()) && Boolean(props.file);
});

function onRatingChange(value: Daily5sRatingValue | null) {
  emit('update:modelValue', {
    rating: value,
    comment: value === 1 ? props.modelValue.comment : '',
  });

  if (value !== 1) {
    emit('update:file', null);
  }
}

function onCommentChange(value: string | number | null) {
  emit('update:modelValue', {
    ...props.modelValue,
    comment: String(value ?? ''),
  });
}

function onFileChange(value: File | null) {
  emit('update:file', value);
}
</script>

<style scoped>
.process-card {
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 38px rgba(29, 49, 57, 0.08);
}

.process-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
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
</style>
