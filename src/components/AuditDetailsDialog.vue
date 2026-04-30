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
                {{ getProcessExplanation(getProcessResult(process.key)?.comment) }}
              </q-item-label>
            </q-item-section>

            <q-item-section side top>
              <q-chip
                dense
                text-color="white"
                :color="getProcessChipColor(getProcessResult(process.key)?.status)"
                class="q-mb-sm"
              >
                {{ getProcessStatusLabel(getProcessResult(process.key)?.status) }}
              </q-chip>

              <q-btn
                v-if="getProcessResult(process.key)?.imageUrl"
                dense
                outline
                icon="download"
                label="Baixar Imagem"
                :loading="downloadingKey === process.key"
                @click="
                  downloadProcessImage(
                    process.key,
                    getProcessResult(process.key)!.imageUrl as string,
                  )
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
import type {
  AuditType,
  AuditProcessStatus,
  DualAuditProcessKey,
  DualTypeAuditResultDocument,
} from 'src/types/audit';

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

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

function close() {
  emit('update:modelValue', false);
}

function getProcessStatusLabel(status: AuditProcessStatus | undefined): string {
  if (status === 'updated') {
    return 'Atualizado';
  }

  if (status === 'not_updated') {
    return 'Problema Encontrado';
  }

  return 'Não Registrado';
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
  return trimmed && trimmed.length > 0 ? trimmed : 'Nenhuma explicação fornecida.';
}

function getClipboardLine(processKey: string, label: string): string {
  const process = getProcessResult(processKey);
  const turmaSuffix = props.audit?.turma ? ` turma ${props.audit.turma}` : '';

  if (!process || process.status === null) {
    return `- ${label} - ⚪ Não registrado${turmaSuffix}`;
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

async function downloadProcessImage(processKey: string, imageUrl: string) {
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
