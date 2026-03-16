<template>
  <q-page class="history-page q-pa-md q-pa-lg-xl">
    <div class="history-shell">
      <q-card flat bordered class="history-card">
        <q-card-section>
          <p class="eyebrow">Audit History</p>
          <h1 class="title">Audit Completed</h1>
          <p class="subtitle">
            The audit was submitted successfully. This page is ready for the future audit history
            listing and serves as the post-completion destination for the current workflow.
          </p>
        </q-card-section>

        <q-card-section>
          <q-btn unelevated color="primary" label="Back to dashboard" to="/" />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts"></script>

<style scoped>
.history-page {
  background: linear-gradient(180deg, #f5f7f4 0%, #edf2ef 100%);
}

.history-shell {
  max-width: 860px;
  margin: 0 auto;
}

.history-card {
  margin-top: 48px;
  border-radius: 28px;
  background: white;
  box-shadow: 0 18px 48px rgba(29, 49, 57, 0.08);
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  color: #58727c;
}

.title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1;
  color: #17343d;
}

.subtitle {
  margin: 14px 0 0;
  color: #5f7077;
  font-size: 1rem;
}
</style>
