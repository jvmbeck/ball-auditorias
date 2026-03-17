<template>
  <q-dialog v-model="isOpen">
    <q-card class="details-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div>
          <div class="text-overline">Audit Details</div>
          <div class="text-h6">
            {{ audit ? formatAuditDate(audit.createdAt) : '' }}
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
          label="Copy Summary"
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
                {{ getProcessExplanation(audit?.processes[process.key]?.comment) }}
              </q-item-label>
            </q-item-section>

            <q-item-section side top>
              <q-chip
                dense
                text-color="white"
                :color="getProcessChipColor(audit?.processes[process.key]?.status)"
                class="q-mb-sm"
              >
                {{ getProcessStatusLabel(audit?.processes[process.key]?.status) }}
              </q-chip>

              <q-btn
                v-if="audit?.processes[process.key]?.imageUrl"
                dense
                outline
                icon="download"
                label="Download Image"
                :loading="downloadingKey === process.key"
                @click="
                  downloadProcessImage(process.key, audit.processes[process.key].imageUrl as string)
                "
              />
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
import type { AuditHistoryItem, AuditProcessKey, AuditProcessStatus } from 'src/types/audit';

interface ProcessDefinition {
  key: AuditProcessKey;
  label: string;
}

const props = defineProps<{
  modelValue: boolean;
  audit: AuditHistoryItem | null;
  processDefinitions: ProcessDefinition[];
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const $q = useQuasar();
const downloadingKey = ref<AuditProcessKey | null>(null);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

function close() {
  emit('update:modelValue', false);
}

function getProcessStatusLabel(status: AuditProcessStatus | undefined): string {
  if (status === 'updated') {
    return 'Updated';
  }

  if (status === 'not_updated') {
    return 'Issue Found';
  }

  return 'Not Recorded';
}

function getProcessChipColor(status: AuditProcessStatus | undefined): string {
  if (status === 'updated') {
    return 'positive';
  }

  if (status === 'not_updated') {
    return 'negative';
  }

  return 'grey-6';
}

function getProcessExplanation(comment: string | null | undefined): string {
  const trimmed = comment?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'No issue explanation provided.';
}

function getClipboardLine(processKey: AuditProcessKey, label: string): string {
  const process = props.audit?.processes[processKey];
  const turmaSuffix = props.audit?.turma ? ` turma ${props.audit.turma}` : '';

  if (!process || process.status === null) {
    return `- ${label} - ⚪ Nao registrado${turmaSuffix}`;
  }

  const isUpdated = process.status === 'updated';
  const icon = isUpdated ? '🟢' : '🔴';
  const statusText = isUpdated ? 'Atualizado' : 'Desatualizado';
  const explanation = process.comment?.trim();

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

async function downloadProcessImage(processKey: AuditProcessKey, imageUrl: string) {
  downloadingKey.value = processKey;

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error('Could not download image.');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = `${props.audit?.id ?? 'audit'}-${processKey}.jpg`;
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
</style>
