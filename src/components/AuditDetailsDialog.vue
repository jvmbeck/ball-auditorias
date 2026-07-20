<template>
  <q-dialog v-model="isOpen">
    <q-card class="details-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div>
          <div class="text-overline">Detalhes da Auditoria</div>
          <div class="text-h6">
            {{ audit ? formatAuditDate(audit.completedAt) : '' }}
          </div>
          <div class="text-caption metadata">
            Turma {{ audit?.turma ?? '-' }} • {{ formatDayOfWeek(audit?.dayOfWeek || '') }} •
            {{ audit?.yearMonth || '-' }}
          </div>
        </div>
        <q-space />
        <q-btn
          outline
          color="primary"
          icon="content_copy"
          label="Copiar Resumo"
          class="q-mr-sm"
          :disable="!audit"
          @click="copyAuditSummary"
        />
        <q-btn icon="close" flat round dense @click="close" />
      </q-card-section>

      <q-card-section>
        <q-list bordered separator class="rounded-borders">
          <q-item v-for="process in processDefinitions" :key="process.key" class="process-item">
            <q-item-section>
              <q-item-label class="process-title">{{ process.label }}</q-item-label>
              <q-item-label caption>
                {{ getProcessExplanation(getProcessResult(process.key)) }}
              </q-item-label>
            </q-item-section>

            <q-item-section side top>
              <q-chip
                dense
                text-color="white"
                :color="getProcessChipColor(getProcessResult(process.key))"
                class="q-mb-sm"
              >
                {{ getProcessStatusLabel(getProcessResult(process.key)) }}
              </q-chip>

              <div
                v-if="getProcessImageUrls(process.key).length"
                class="download-actions column q-gutter-xs"
              >
                <q-btn
                  v-for="(imageUrl, imageIndex) in getProcessImageUrls(process.key)"
                  :key="`${process.key}-${imageIndex}`"
                  dense
                  outline
                  icon="download"
                  :label="`Baixar Imagem ${imageIndex + 1}`"
                  :loading="downloadingKey === `${process.key}-${imageIndex}`"
                  @click="downloadProcessImage(process.key, imageUrl, imageIndex + 1)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { formatAuditDate, formatDayOfWeek } from 'src/utils/dateFormatting';
import type { AuditType, DualAuditProcessKey, DualTypeAuditResultDocument } from 'src/types/audit';

type HistoryAuditItem = {
  id: string;
  type: AuditType;
  turma: 'A e C' | 'B e D' | null;
  date: string;
  dayOfWeek: string;
  yearMonth: string;
  completedAt: Date | null;
  failedProcesses: number;
  totalProcesses: number;
  hasFailures: boolean;
  processes: Partial<Record<DualAuditProcessKey, DualTypeAuditResultDocument>>;
};

interface ProcessDefinition {
  key: string;
  label: string;
}

const props = defineProps<{
  modelValue: boolean;
  audit: HistoryAuditItem | null;
  processDefinitions: ProcessDefinition[];
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const $q = useQuasar();
const downloadingKey = ref<string | null>(null);

function getProcessResult(key: string): DualTypeAuditResultDocument | undefined {
  return props.audit?.processes[key as DualAuditProcessKey];
}

function getProcessImageUrls(processKey: string): string[] {
  const result = getProcessResult(processKey);

  if (!result) {
    return [];
  }

  return Array.isArray(result.imageUrls)
    ? result.imageUrls.filter((url): url is string => typeof url === 'string' && url.length > 0)
    : [];
}

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

function close() {
  emit('update:modelValue', false);
}

function getProcessStatusLabel(result: DualTypeAuditResultDocument | undefined): string {
  if (!result) {
    return 'Nao Registrado';
  }

  if (result.rating === 1 || result.rating === 3 || result.rating === 5) {
    return `Nota ${result.rating}`;
  }

  if (result.status === 'updated') {
    return 'Atualizado';
  }

  if (result.status === 'not_updated') {
    return 'Problema Encontrado';
  }

  return 'Nao Registrado';
}

function getProcessChipColor(result: DualTypeAuditResultDocument | undefined): string {
  if (!result) {
    return 'grey-6';
  }

  if (result.rating === 1) {
    return 'negative';
  }

  if (result.rating === 3) {
    return 'warning';
  }

  if (result.rating === 5 || result.status === 'updated') {
    return 'positive';
  }

  if (result.status === 'not_updated') {
    return 'negative';
  }

  return 'grey-6';
}

function formatGrade1Reason(
  grade1Reason: unknown,
  legacyComment: string | null | undefined,
): string {
  if (typeof grade1Reason === 'string') {
    return grade1Reason.trim();
  }

  if (Array.isArray(grade1Reason)) {
    const normalized = grade1Reason
      .filter((reason) => typeof reason === 'string')
      .map((reason) => reason.trim())
      .filter((reason) => reason.length > 0);

    if (normalized.length > 0) {
      return normalized.join(', ');
    }
  }

  return legacyComment?.trim() || '';
}

function getProcessExplanation(result: DualTypeAuditResultDocument | undefined): string {
  if (!result) {
    return 'Nenhuma explicação fornecida.';
  }

  const reason = formatGrade1Reason(result.grade1Reason, result.comment);
  const detail = result.grade1Comment?.trim() || '';

  if (reason && detail) {
    return `${reason} - ${detail}`;
  }

  if (reason) {
    return reason;
  }

  if (detail) {
    return detail;
  }

  return 'Nenhuma explicação fornecida.';
}

function getClipboardLine(processKey: string, label: string): string {
  const process = getProcessResult(processKey);
  const turmaSuffix = props.audit?.turma ? ` turma ${props.audit.turma}` : '';

  if (!process) {
    return `- ${label} - ⚪ Nao registrado${turmaSuffix}`;
  }

  const reason = formatGrade1Reason(process.grade1Reason, process.comment);
  const detail = process.grade1Comment?.trim() || '';
  const explanation = reason && detail ? `${reason} - ${detail}` : reason || detail;

  if (process.rating === 1 || process.rating === 3 || process.rating === 5) {
    const icon = process.rating === 1 ? '🔴' : process.rating === 3 ? '🟡' : '🟢';
    const statusText = `Nota ${process.rating}`;

    return explanation && explanation.length > 0
      ? `- ${label} - ${icon} ${statusText}${turmaSuffix} ${explanation}`
      : `- ${label} - ${icon} ${statusText}${turmaSuffix}`;
  }

  const isUpdated = process.status === 'updated';
  const icon = isUpdated ? '🟢' : '🔴';
  const statusText = isUpdated ? 'Atualizado' : 'Desatualizado';

  return explanation && explanation.length > 0
    ? `- ${label} - ${icon} ${statusText}${turmaSuffix} ${explanation}`
    : `- ${label} - ${icon} ${statusText}${turmaSuffix}`;
}

function buildClipboardSummary(): string {
  return props.processDefinitions
    .map((process) => getClipboardLine(process.key, process.label))
    .join('\n');
}

async function writeToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

async function copyAuditSummary() {
  if (!props.audit) {
    return;
  }

  try {
    const summary = buildClipboardSummary();
    await writeToClipboard(summary);
    $q.notify({ type: 'positive', message: 'Audit summary copied to clipboard.' });
  } catch (err: unknown) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Failed to copy summary.',
    });
  }
}

async function downloadProcessImage(processKey: string, imageUrl: string, imageNumber: number) {
  downloadingKey.value = `${processKey}-${imageNumber - 1}`;

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error('Could not download image.');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = `${props.audit?.id ?? 'audit'}-${processKey}-${imageNumber}.jpg`;
    link.click();

    URL.revokeObjectURL(objectUrl);
  } catch (err: unknown) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Failed to download image.',
    });
  } finally {
    downloadingKey.value = null;
  }
}
</script>

<style scoped>
.details-dialog {
  width: min(920px, 96vw);
  max-width: 920px;
  border-radius: 18px;
}

.process-item {
  align-items: flex-start;
}

.process-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: #17343d;
}

.metadata {
  color: #5f7077;
}

.download-actions {
  min-width: 170px;
}
</style>
