<template>
  <q-page class="index-page q-pa-md q-pa-lg-xl">
    <div class="index-shell">
      <section class="hero q-mb-xl">
        <p class="eyebrow">Ball Factory</p>
        <h1 class="hero-title">Daily Audit</h1>
        <p class="hero-subtitle">Inspect all 6 production processes and submit your findings.</p>
        <q-btn
          class="q-mt-md"
          outline
          color="primary"
          icon="refresh"
          label="Refresh analytics"
          :loading="refreshingAnalytics"
          @click="handleRefreshAnalytics"
        />
      </section>

      <q-card flat bordered class="action-card">
        <q-card-section>
          <!-- Completed -->
          <template v-if="todaysDraft?.completed">
            <div class="resume-header q-mb-md">
              <q-icon name="task_alt" size="28px" color="positive" class="q-mr-sm" />
              <span class="resume-title" style="color: var(--q-positive)">Today's audit is complete</span>
            </div>

            <div class="progress-row q-mb-md">
              <span class="progress-label">
                All {{ TOTAL_PROCESSES }} processes reviewed and submitted
              </span>
              <q-linear-progress
                rounded
                size="10px"
                color="positive"
                track-color="grey-3"
                :value="1"
                class="q-mt-sm"
              />
            </div>

            <q-btn
              unelevated
              color="positive"
              icon-right="history"
              label="View Audit History"
              size="md"
              :to="{ name: 'audit-history' }"
              class="full-width"
            />
          </template>

          <!-- In progress -->
          <template v-else-if="todaysDraft">
            <div class="resume-header q-mb-md">
              <q-icon name="pending_actions" size="28px" color="primary" class="q-mr-sm" />
              <span class="resume-title">Audit in progress</span>
            </div>

            <div class="progress-row q-mb-md">
              <span class="progress-label">
                {{ todaysDraft.completedCount }} / {{ TOTAL_PROCESSES }} processes reviewed
              </span>
              <q-linear-progress
                rounded
                size="10px"
                color="primary"
                track-color="grey-3"
                :value="todaysDraft.completedCount / TOTAL_PROCESSES"
                class="q-mt-sm"
              />
            </div>

            <q-btn
              unelevated
              color="primary"
              icon-right="arrow_forward"
              label="Continue Audit"
              size="md"
              to="/audits"
              class="full-width"
            />
          </template>

          <!-- Not started -->
          <template v-else>
            <div class="start-header q-mb-md">
              <q-icon name="fact_check" size="28px" color="positive" class="q-mr-sm" />
              <span class="start-title">No audit started today</span>
            </div>

            <p class="start-hint q-mb-md">
              Begin a new inspection to review all production processes.
            </p>

            <q-btn
              unelevated
              color="positive"
              icon-right="arrow_forward"
              label="Start Audit"
              size="md"
              to="/audits"
              class="full-width"
            />
          </template>
        </q-card-section>
      </q-card>

      <FailuresByProcessCard class="q-mt-lg" />
      <ProcessFailureRateCard class="q-mt-lg" />
      <FailuresOverTimeCard class="q-mt-lg" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import FailuresByProcessCard from 'src/components/FailuresByProcessCard.vue';
import FailuresOverTimeCard from 'src/components/FailuresOverTimeCard.vue';
import ProcessFailureRateCard from 'src/components/ProcessFailureRateCard.vue';
import { useAnalyticsStore } from 'src/stores/analytics.store';
import { useAuditStore } from 'src/stores/audit.store';

const TOTAL_PROCESSES = 6;

const $q = useQuasar();
const auditStore = useAuditStore();
const analyticsStore = useAnalyticsStore();

const todaysDraft = ref<{
  auditId: string;
  turma: 'A' | 'B' | 'C' | 'D' | null;
  completedCount: number;
  completed: boolean;
} | null>(null);
const refreshingAnalytics = ref(false);

async function handleRefreshAnalytics() {
  refreshingAnalytics.value = true;

  try {
    await analyticsStore.refreshAllAnalytics();
    $q.notify({
      type: 'positive',
      message: 'Analytics refreshed.',
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Unable to refresh analytics right now.',
    });
  } finally {
    refreshingAnalytics.value = false;
  }
}

onMounted(() => {
  todaysDraft.value = auditStore.checkTodaysDraft();
});
</script>

<style scoped>
.index-page {
  background: linear-gradient(160deg, #f4f7f5 0%, #eaf1ec 100%);
  min-height: 100vh;
}

.index-shell {
  max-width: 900px;
  margin: 0 auto;
  padding-top: min(10vh, 84px);
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

.action-card {
  border-radius: 24px;
  background: white;
  box-shadow: 0 18px 48px rgba(29, 49, 57, 0.08);
}

.resume-header,
.start-header {
  display: flex;
  align-items: center;
}

.resume-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #17343d;
}

.start-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #17343d;
}

.progress-label {
  font-size: 0.9rem;
  color: #5f7077;
}

.start-hint {
  color: #5f7077;
  font-size: 0.95rem;
  margin: 0;
}
</style>
