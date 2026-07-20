<template>
  <q-dialog v-model="isOpen" maximized-on-mobile>
    <q-card class="details-dialog">
      <q-card-section class="row items-start q-pb-none">
        <div>
          <div class="text-overline">Detalhes da Celula</div>
          <div class="text-h6">{{ details?.processLabel ?? '-' }}</div>
          <div class="text-caption metadata">
            {{ details?.dateLabel ?? '-' }} • Turma {{ details?.turma ?? '-' }}
          </div>
        </div>

        <q-space />

        <q-chip v-if="details" dense :color="ratingChipColor" text-color="white" class="q-mr-sm">
          {{ ratingChipLabel }}
        </q-chip>

        <q-btn icon="close" flat round dense @click="close" />
      </q-card-section>

      <q-separator class="q-mt-md" />

      <q-card-section v-if="loading" class="state-box">
        <q-spinner color="primary" size="30px" />
        <span>Carregando detalhes da avaliacao...</span>
      </q-card-section>

      <q-card-section v-else-if="error" class="state-box">
        <q-icon name="error" color="negative" size="22px" />
        <span>{{ error }}</span>
      </q-card-section>

      <q-card-section v-else>
        <div class="section-block q-mb-md">
          <div class="section-title">Motivo</div>
          <div class="section-content">{{ details?.reason || 'Nao informado' }}</div>
        </div>

        <div class="section-block q-mb-md">
          <div class="section-title">Comentario do auditor</div>
          <div class="section-content">
            {{ details?.auditorComment || 'Sem comentario do auditor' }}
          </div>
        </div>

        <div class="section-block">
          <div class="section-title">Imagens anexadas</div>

          <div v-if="!details?.imageUrls?.length" class="empty-box">Nenhuma imagem anexada.</div>

          <div v-else class="images-grid">
            <button
              v-for="(imageUrl, index) in details.imageUrls"
              :key="`${imageUrl}-${index}`"
              type="button"
              class="image-thumb-btn"
              @click="openImageViewer(index)"
            >
              <img
                :src="imageUrl"
                :alt="`Imagem ${index + 1}`"
                class="image-thumb"
                loading="lazy"
              />
            </button>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-model="isImageViewerOpen" maximized>
    <q-card class="image-viewer-card bg-black text-white">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-subtitle1">Imagens da avaliacao</div>
        <q-space />
        <q-btn icon="close" flat round dense color="white" @click="isImageViewerOpen = false" />
      </q-card-section>

      <q-card-section class="viewer-body">
        <q-carousel
          v-model="activeImageSlide"
          animated
          swipeable
          navigation
          arrows
          infinite
          control-color="white"
          class="full-carousel"
        >
          <q-carousel-slide
            v-for="(imageUrl, index) in details?.imageUrls ?? []"
            :key="`${imageUrl}-${index}`"
            :name="index"
            class="carousel-slide"
          >
            <img :src="imageUrl" :alt="`Imagem ${index + 1}`" class="viewer-image" />
          </q-carousel-slide>
        </q-carousel>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Daily5sHeatmapValue, Daily5sTurma } from 'src/types/audit';

interface HeatmapDetailPayload {
  date: string;
  dateLabel: string;
  turma: Daily5sTurma;
  processKey: string;
  processLabel: string;
  rating: Daily5sHeatmapValue;
  reason: string | null;
  auditorComment: string | null;
  imageUrls: string[];
}

const props = defineProps<{
  modelValue: boolean;
  loading: boolean;
  error: string | null;
  details: HeatmapDetailPayload | null;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const isImageViewerOpen = ref(false);
const activeImageSlide = ref(0);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const ratingChipLabel = computed(() => {
  const rating = props.details?.rating;

  if (rating === 1 || rating === 3 || rating === 5) {
    return `Nota ${rating}`;
  }

  return 'Sem avaliacao';
});

const ratingChipColor = computed(() => {
  const rating = props.details?.rating;

  if (rating === 1) {
    return 'negative';
  }

  if (rating === 3) {
    return 'warning';
  }

  if (rating === 5) {
    return 'positive';
  }

  return 'grey-6';
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      isImageViewerOpen.value = false;
      activeImageSlide.value = 0;
    }
  },
);

function close(): void {
  emit('update:modelValue', false);
}

function openImageViewer(index: number): void {
  activeImageSlide.value = index;
  isImageViewerOpen.value = true;
}
</script>

<style scoped>
.details-dialog {
  width: min(920px, 96vw);
  max-width: 920px;
  border-radius: 18px;
}

.metadata {
  color: #5f7077;
}

.state-box {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #5f7077;
  text-align: center;
}

.section-block {
  border: 1px solid #e2ebf0;
  border-radius: 14px;
  padding: 12px;
  background: #fafcfd;
}

.section-title {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #5f7077;
  margin-bottom: 8px;
}

.section-content {
  color: #17343d;
  font-size: 0.95rem;
  line-height: 1.45;
  white-space: pre-wrap;
}

.empty-box {
  border: 1px dashed #c7d7df;
  border-radius: 12px;
  padding: 14px;
  color: #5f7077;
  background: #f5f9fb;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}

.image-thumb-btn {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.image-thumb {
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #d9e4ea;
}

.image-viewer-card {
  width: 100vw;
  height: 100vh;
}

.viewer-body {
  height: calc(100vh - 64px);
}

.full-carousel {
  height: 100%;
  background: #111;
}

.carousel-slide {
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
