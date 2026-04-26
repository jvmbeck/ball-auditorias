<template>
  <q-card flat bordered class="process-card full-height">
    <q-card-section class="row items-start justify-between q-gutter-sm">
      <div>
        <div class="process-label">{{ label }}</div>
        <div class="process-hint">
          Selecione o resultado. Salve o processo para registrar a atualização.
        </div>
      </div>

      <q-chip dense :color="statusChip.color" text-color="white">
        {{ statusChip.label }}
      </q-chip>
    </q-card-section>

    <q-card-section>
      <q-option-group
        :model-value="modelValue.status"
        :options="statusOptions"
        color="primary"
        type="radio"
        inline
        @update:model-value="onStatusChange"
      />

      <div v-if="modelValue.status === 'not_updated'" class="q-mt-md">
        <q-input
          :model-value="modelValue.comment"
          autogrow
          outlined
          type="textarea"
          label="Explique o problema"
          class="q-mb-md"
          @update:model-value="onCommentChange"
        />

        <q-file
          :model-value="file"
          outlined
          clearable
          accept="image/*"
          label="Envie uma foto como evidência"
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
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface ProcessValue {
  status: 'updated' | 'not_updated' | null;
  comment: string;
}

const props = defineProps<{
  processKey: string;
  label: string;
  modelValue: ProcessValue;
  file: File | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ProcessValue];
  'update:file': [file: File | null];
  save: [];
}>();

const statusOptions = [
  { label: 'Atualizado', value: 'updated' },
  { label: 'Problema Encontrado', value: 'not_updated' },
];

const statusChip = computed(() => {
  if (props.modelValue.status === 'updated') {
    return { label: 'Atualizado', color: 'positive' };
  }
  if (props.modelValue.status === 'not_updated') {
    return { label: 'Problema Encontrado', color: 'negative' };
  }
  return { label: 'Não Iniciado', color: 'grey-6' };
});

const isValid = computed(() => {
  const { status, comment } = props.modelValue;

  if (status === null) return false;
  if (status === 'updated') return true;

  return Boolean(comment.trim()) && Boolean(props.file);
});

function onStatusChange(value: string | null) {
  const updatedStatus = value as ProcessValue['status'];
  emit('update:modelValue', {
    status: updatedStatus,
    comment: updatedStatus === 'updated' ? '' : props.modelValue.comment,
  });
  if (updatedStatus === 'updated') {
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
