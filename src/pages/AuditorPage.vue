<template>
  <q-page class="index-page q-pa-md">
    <div class="index-shell">
      <!-- Hero section -->
      <section class="hero">
        <p class="eyebrow">Ball</p>
        <h1 class="hero-title">Auditores</h1>
      </section>

      <div>
        <section>
          <div class="daily5s-grid">
            <Daily5sCard />
            <Daily5sRatedProcessesCard />
          </div>
        </section>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import Daily5sCard from 'src/components/daily5s/audit/Daily5sCard.vue';
import Daily5sRatedProcessesCard from 'src/components/daily5s/audit/Daily5sRatedProcessesCard.vue';
</script>

<style scoped>
.index-page {
  background: linear-gradient(160deg, #f4f7f5 0%, #eaf1ec 100%);
  min-height: 100vh;
}

.index-shell {
  max-width: 1320px;
  margin: 0 auto;
  padding-top: min(5vh, 84px);
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

.daily5s-grid {
  display: flex;
  gap: 2rem;
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.78rem;
  color: #5f7077;
}

.hero-title {
  margin: 0;
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  font-weight: 800;
  line-height: 1;
  color: #17343d;
}

.hero-subtitle {
  margin: 12px 0 0;
  color: #5f7077;
  font-size: 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .index-shell {
    padding: 1rem;
    padding-top: 1rem;
    flex-direction: column;
  }
  .daily5s-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
}
</style>
