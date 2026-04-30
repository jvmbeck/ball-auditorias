import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth.store';
import { getCompletedAuditHistory } from 'src/services/audit';
import type { AuditServiceConfig, AuditType, DualTypeHistoryItem } from 'src/types/audit';

// ── Audit type registry ───────────────────────────────────────────────────────
//
// Add a new entry here (matching the service config) whenever a new audit type
// is introduced. The store is otherwise fully generic.

const AUDIT_TYPE_REGISTRY: Record<AuditType, AuditServiceConfig> = {
  rto: {
    auditCollection: 'rtoAudits',
    resultsCollection: 'rtoProcessResults',
  },
  board5s: {
    auditCollection: 'board5sAudits',
    resultsCollection: 'board5sProcessResults',
  },
};

export const AUDIT_TYPES = Object.keys(AUDIT_TYPE_REGISTRY) as AuditType[];

// ── Store ─────────────────────────────────────────────────────────────────────

export const useHistoryStore = defineStore('history', () => {
  const authStore = useAuthStore();

  // ── State ──────────────────────────────────────────────────────────────────

  /** Completed history items per audit type. */
  const historyByType = ref<Partial<Record<AuditType, DualTypeHistoryItem[]>>>({});

  /** Loading flag per audit type. */
  const loadingByType = ref<Partial<Record<AuditType, boolean>>>({});

  /** Last error per audit type. */
  const errorByType = ref<Partial<Record<AuditType, string | null>>>({});

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Loads completed audit history for a single audit type.
   * Results are stored in `historyByType[type]`.
   */
  async function loadHistoryByType(type: AuditType): Promise<void> {
    const inspectorId = authStore.firebaseUser?.uid;

    if (!inspectorId) {
      errorByType.value[type] = 'Cannot load history: no authenticated user.';
      historyByType.value[type] = [];
      return;
    }

    loadingByType.value[type] = true;
    errorByType.value[type] = null;

    try {
      const config = AUDIT_TYPE_REGISTRY[type];
      historyByType.value[type] = await getCompletedAuditHistory(inspectorId, type, config);
    } catch (err: unknown) {
      errorByType.value[type] = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      loadingByType.value[type] = false;
    }
  }

  /**
   * Loads history for all registered audit types in parallel.
   */
  async function loadAllHistory(): Promise<void> {
    await Promise.all(AUDIT_TYPES.map((type) => loadHistoryByType(type)));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    historyByType,
    loadingByType,
    errorByType,
    loadHistoryByType,
    loadAllHistory,
  };
});
