import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { FailuresOverTimeData, AuditType } from 'src/types/audit';
import { toDateKey } from 'src/utils/dateFormatting';

function getResultsCollection(type?: AuditType): string {
  if (type === 'rto') return 'rtoProcessResults';
  if (type === 'board5s') return 'board5sProcessResults';
  return 'auditResults'; // Legacy fallback
}

/**
 * Fetches and aggregates failed process records from the appropriate results collection.
 * Supports both legacy (auditResults) and dual-type (rtoProcessResults, board5sProcessResults).
 *
 * @param type Optional audit type ('rto' or 'board5s'). If omitted, uses legacy collection.
 * @returns Date labels and failure counts for a line chart
 */
export async function fetchFailuresOverTime(type?: AuditType): Promise<FailuresOverTimeData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);

  const startDateKey = toDateKey(startDate);

  const failuresByDate: Record<string, number> = {};

  // Fill every day in the range with 0 so the chart always has a continuous timeline.
  for (let index = 0; index < 30; index += 1) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + index);
    failuresByDate[toDateKey(current)] = 0;
  }

  const collectionName = getResultsCollection(type);
  const resultsQuery = query(collection(db, collectionName), where('date', '>=', startDateKey));
  const snapshots = await getDocs(resultsQuery);

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<{ date: unknown; hasIssue: unknown }>;
    const date = typeof data.date === 'string' ? data.date : null;
    const hasIssue = data.hasIssue === true;

    if (!date || !hasIssue) {
      return;
    }

    if (!(date in failuresByDate)) {
      return;
    }

    const currentCount = failuresByDate[date] ?? 0;
    failuresByDate[date] = currentCount + 1;
  });

  const labels = Object.keys(failuresByDate);
  const chartData = labels.map((label) => failuresByDate[label] ?? 0);

  return {
    labels,
    data: chartData,
    countsByDate: failuresByDate,
  };
}
