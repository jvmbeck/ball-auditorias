<template>
  <q-dialog v-model="isOpen">
    <q-card class="daily5s-info-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div>
          <div class="text-overline">Guia de Pontuação 5S</div>
          <div class="text-h6">{{ processLabel }}</div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense @click="isOpen = false" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="carousel-heading">Referencias visuais de Nota 5</div>

        <div v-if="isLoadingImages" class="carousel-loading row items-center justify-center">
          <q-spinner color="primary" size="28px" />
        </div>

        <q-carousel
          v-else-if="referenceImages.length > 0"
          v-model="currentSlide"
          arrows
          navigation
          animated
          swipeable
          infinite
          height="270px"
          class="reference-carousel bg-grey-2"
        >
          <q-carousel-slide
            v-for="(imageUrl, index) in referenceImages"
            :key="imageUrl"
            :name="index"
            class="carousel-slide"
          >
            <q-btn
              icon="open_in_full"
              round
              dense
              flat
              color="white"
              class="expand-image-btn"
              @click="openFullscreenImage(imageUrl)"
            >
              <q-tooltip anchor="top middle" self="bottom middle">Ver em tela cheia</q-tooltip>
            </q-btn>

            <img
              :src="imageUrl"
              :alt="`Referencia Nota 5 ${index + 1} - ${processLabel}`"
              class="slide-image"
            />
          </q-carousel-slide>
        </q-carousel>

        <q-banner v-else rounded class="bg-blue-1 text-blue-9">
          Ainda nao ha imagens de referencia para este processo.
        </q-banner>
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-model="isFullscreenOpen" maximized>
    <q-card class="fullscreen-card">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-subtitle1 text-white">{{ processLabel }}</div>
        <q-space />
        <q-btn icon="close" flat round dense color="white" @click="isFullscreenOpen = false" />
      </q-card-section>

      <q-card-section class="fullscreen-image-wrapper">
        <img
          v-if="fullscreenImageUrl"
          :src="fullscreenImageUrl"
          :alt="`Referencia em tela cheia - ${processLabel}`"
          class="fullscreen-image"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getProcessReferenceImages } from '../../../utils/daily5sReferenceImages';

const props = defineProps<{
  modelValue: boolean;
  processKey: string;
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

const currentSlide = ref(0);
const referenceImages = ref<string[]>([]);
const isLoadingImages = ref(false);
const isFullscreenOpen = ref(false);
const fullscreenImageUrl = ref<string | null>(null);

let requestId = 0;

watch(
  () => [isOpen.value, props.processKey],
  async ([open]) => {
    if (!open) {
      return;
    }

    requestId += 1;
    const activeRequestId = requestId;
    isLoadingImages.value = true;

    const images = await getProcessReferenceImages(props.processKey);

    if (activeRequestId !== requestId) {
      return;
    }

    referenceImages.value = images;
    currentSlide.value = 0;
    isLoadingImages.value = false;
  },
  { immediate: true },
);

function openFullscreenImage(imageUrl: string) {
  fullscreenImageUrl.value = imageUrl;
  isFullscreenOpen.value = true;
}
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

.carousel-heading {
  font-size: 0.96rem;
  font-weight: 700;
  color: #17343d;
  margin-bottom: 10px;
}

.carousel-loading {
  border-radius: 14px;
  border: 1px dashed #bdd4dd;
  min-height: 120px;
}

.reference-carousel {
  border-radius: 14px;
  background: #e8eff2;
}

.carousel-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  position: relative;
}

.expand-image-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
  background: rgba(23, 52, 61, 0.7);
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  border-radius: 10px;
  background: #f6f9fb;
}

.fullscreen-card {
  background: #0f1b20;
}

.fullscreen-image-wrapper {
  height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.fullscreen-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}
</style>
