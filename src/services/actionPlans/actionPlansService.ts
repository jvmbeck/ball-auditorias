import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import { db } from 'boot/firebase';
import {
  ACTION_OWNER_BY_REASON,
  type ActionPlanStatus,
  type ActionPlanDocument,
  type ActionPlan,
} from 'src/types/actionPlans';
import type { Daily5sAuditProcessKey, Daily5sIssueReason } from 'src/types/audit';
import { DAILY5S_PROCESS_DEFINITIONS } from 'src/services/daily5s/daily5sDefinitions';
import { ACTION_PLAN_REASON_KEY } from 'src/types/actionPlans';

const ACTION_PLANS_COLLECTION = 'daily5sActionPlans';

interface SyncActionPlansParams {
  auditDate: string;
  processKey: Daily5sAuditProcessKey;
  auditorId: string;
  previousReasons: Daily5sIssueReason[];
  currentReasons: Daily5sIssueReason[];
}

function buildActionPlanId(
  auditDate: string,
  processKey: Daily5sAuditProcessKey,
  reason: Daily5sIssueReason,
): string {
  return `${auditDate}_${processKey}_${ACTION_PLAN_REASON_KEY[reason]}`;
}

function getProcessName(processKey: Daily5sAuditProcessKey): string {
  const definition = DAILY5S_PROCESS_DEFINITIONS.find((process) => process.key === processKey);

  if (!definition) {
    throw new Error(`Unknown Daily 5S process: ${processKey}`);
  }

  // Change "label" here if your definition uses another property name.
  return definition.label;
}

/**
 * Makes the action-plan collection match the current issue reasons
 * for one process result.
 */
export async function syncActionPlans({
  auditDate,
  processKey,
  auditorId,
  previousReasons,
  currentReasons,
}: SyncActionPlansParams): Promise<void> {
  const previousReasonSet = new Set(previousReasons);
  const currentReasonSet = new Set(currentReasons);

  const reasonsToCreate = currentReasons.filter((reason) => !previousReasonSet.has(reason));

  const reasonsToCancel = previousReasons.filter((reason) => !currentReasonSet.has(reason));

  if (!reasonsToCreate.length && !reasonsToCancel.length) {
    return;
  }

  const processName = getProcessName(processKey);
  const batch = writeBatch(db);

  for (const reason of reasonsToCreate) {
    const actionPlanId = buildActionPlanId(auditDate, processKey, reason);

    const actionPlanRef = doc(db, ACTION_PLANS_COLLECTION, actionPlanId);

    batch.set(
      actionPlanRef,
      {
        auditDate,
        processKey,
        processName,
        auditorId,
        reason,
        owner: ACTION_OWNER_BY_REASON[reason],
        status: 'Aberto',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        completedAt: null,
        cancelledAt: null,
      },
      { merge: true },
    );
  }

  for (const reason of reasonsToCancel) {
    const actionPlanId = buildActionPlanId(auditDate, processKey, reason);

    const actionPlanRef = doc(db, ACTION_PLANS_COLLECTION, actionPlanId);

    batch.set(
      actionPlanRef,
      {
        status: 'Cancelado' satisfies ActionPlanStatus,
        updatedAt: serverTimestamp(),
        cancelledAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
}

export async function getActionPlansByDate(auditDate: string): Promise<ActionPlan[]> {
  const actionPlansRef = collection(db, ACTION_PLANS_COLLECTION);

  const actionPlansQuery = query(actionPlansRef, where('auditDate', '==', auditDate));

  const snapshot = await getDocs(actionPlansQuery);

  const plans = snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...(documentSnapshot.data() as ActionPlanDocument),
  }));

  return plans.sort((first, second) => {
    const firstTime = first.createdAt?.toMillis?.() ?? 0;
    const secondTime = second.createdAt?.toMillis?.() ?? 0;

    return firstTime - secondTime;
  });
}

export async function completeActionPlan(actionPlanId: string): Promise<void> {
  if (!actionPlanId.trim()) {
    throw new Error('Action plan ID is required.');
  }

  const actionPlanRef = doc(db, ACTION_PLANS_COLLECTION, actionPlanId);

  await updateDoc(actionPlanRef, {
    status: 'Concluído',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    cancelledAt: null,
  });
}
