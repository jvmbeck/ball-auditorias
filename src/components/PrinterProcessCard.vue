<template>
  <q-card flat bordered class="process-card full-height">
    <q-card-section class="row items-start justify-between q-gutter-sm">
      <div>
        <div class="process-title">
          <div class="process-label">{{ label }}</div>
          <q-icon
            v-if="isSaved && hasSelection"
            name="check_circle"
            color="positive"
            size="28px"
            class="q-mr-xs"
          >
            <q-tooltip anchor="top middle" self="bottom middle">Salvo no banco de dados</q-tooltip>
          </q-icon>
        </div>

        <div class="process-hint">
          Registre cada impressora separadamente. Salve o processo para registrar as três
          verificações.
        </div>
      </div>

      <div class="status-icons">
        <q-chip dense :color="statusChip.color" text-color="white">
          {{ statusChip.label }}
        </q-chip>
      </div>
    </q-card-section>

    <q-card-section class="q-gutter-md">
      <section
        v-for="printer in printerDefinitions"
        :key="printer.key"
        class="printer-section q-pa-md"
      >
        <div class="printer-section-header q-mb-sm">
          <div>
            <div class="printer-label">{{ printer.label }}</div>
            <div class="printer-hint">Selecione o resultado desta impressora.</div>
          </div>

          <q-chip dense :color="getPrinterChip(printer.key).color" text-color="white">
            {{ getPrinterChip(printer.key).label }}
          </q-chip>
        </div>

        <q-option-group
          :model-value="checks[printer.key].status"
          :options="statusOptions"
          color="primary"
          type="radio"
          inline
          @update:model-value="onStatusChange(printer.key, $event)"
        />

        <div v-if="checks[printer.key].status === 'not_updated'" class="q-mt-md">
          <q-input
            :model-value="checks[printer.key].comment"
            autogrow
            outlined
            type="textarea"
            label="Explique o problema"
            class="q-mb-md"
            @update:model-value="onCommentChange(printer.key, $event)"
          />

          <q-file
            :model-value="files[printer.key]"
            outlined
            clearable
            accept="image/*"
            label="Envie uma foto como evidencia"
            bottom-slots
            @update:model-value="onFileChange(printer.key, $event)"
          >
            <template #prepend>
              <q-icon name="photo_camera" />
            </template>
          </q-file>
        </div>
      </section>
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
import { computed, watch } from 'vue';
import type { AuditProcessStatus, PrinterCheckKey } from 'src/types/audit';

interface PrinterCheckValue {
  status: AuditProcessStatus;
  comment: string;
}

type PrinterChecksValue = Record<PrinterCheckKey, PrinterCheckValue>;
type PrinterFilesValue = Record<PrinterCheckKey, File | null>;

const props = defineProps<{
  label: string;
  checks: PrinterChecksValue;
  files: PrinterFilesValue;
  loading: boolean;
  isSaved: boolean;
}>();

const emit = defineEmits<{
  'update:checks': [value: PrinterChecksValue];
  'update:files': [value: PrinterFilesValue];
  'update:isSaved': [isSaved: boolean];
  save: [];
}>();

const printerDefinitions: Array<{ key: PrinterCheckKey; label: string }> = [
  { key: 'printer1', label: 'Printer 1' },
  { key: 'printer2', label: 'Printer 2' },
  { key: 'printer3', label: 'Printer 3' },
];

const statusOptions = [
  { label: 'Atualizado', value: 'updated' },
  { label: 'Problema Encontrado', value: 'not_updated' },
];

watch(
  () => props.checks,
  () => {
    if (props.isSaved) {
      emit('update:isSaved', false);
    }
  },
  { deep: true },
);

watch(
  () => props.files,
  () => {
    if (props.isSaved) {
      emit('update:isSaved', false);
    }
  },
  { deep: true },
);

const hasSelection = computed(() =>
  printerDefinitions.some((printer) => props.checks[printer.key].status !== null),
);

const statusChip = computed(() => {
  const statuses = printerDefinitions.map((printer) => props.checks[printer.key].status);

  if (statuses.some((status) => status === 'not_updated')) {
    return { label: 'Problema Encontrado', color: 'negative' };
  }

  if (statuses.every((status) => status === 'updated')) {
    return { label: 'Atualizado', color: 'positive' };
  }

  return { label: 'Nao Iniciado', color: 'grey-6' };
});

const isValid = computed(() =>
  printerDefinitions.every((printer) => {
    const check = props.checks[printer.key];
    const file = props.files[printer.key];

    if (check.status === null) return false;
    if (check.status === 'updated') return true;

    return Boolean(check.comment.trim()) && Boolean(file);
  }),
);

function getPrinterChip(printerKey: PrinterCheckKey) {
  const status = props.checks[printerKey].status;

  if (status === 'updated') {
    return { label: 'Atualizado', color: 'positive' };
  }

  if (status === 'not_updated') {
    return { label: 'Problema Encontrado', color: 'negative' };
  }

  return { label: 'Nao Iniciado', color: 'grey-6' };
}

function onStatusChange(printerKey: PrinterCheckKey, value: string | null) {
  const updatedStatus = value as AuditProcessStatus;

  emit('update:checks', {
    ...props.checks,
    [printerKey]: {
      status: updatedStatus,
      comment: updatedStatus === 'updated' ? '' : props.checks[printerKey].comment,
    },
  });

  if (updatedStatus === 'updated') {
    emit('update:files', {
      ...props.files,
      [printerKey]: null,
    });
  }
}

function onCommentChange(printerKey: PrinterCheckKey, value: string | number | null) {
  emit('update:checks', {
    ...props.checks,
    [printerKey]: {
      ...props.checks[printerKey],
      comment: String(value ?? ''),
    },
  });
}

function onFileChange(printerKey: PrinterCheckKey, value: File | null) {
  emit('update:files', {
    ...props.files,
    [printerKey]: value,
  });
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

.process-title {
  display: flex;
  flex-direction: row;
  gap: 4px;
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

.status-icons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.printer-section {
  border: 1px solid rgba(95, 112, 119, 0.18);
  border-radius: 18px;
  background: rgba(246, 248, 247, 0.9);
}

.printer-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.printer-label {
  font-size: 1rem;
  font-weight: 700;
  color: #17343d;
}

.printer-hint {
  margin-top: 4px;
  color: #5f7077;
  font-size: 0.88rem;
}
</style>
