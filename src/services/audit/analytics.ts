import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { FailuresOverTimeData } from 'src/types/audit';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetches and aggregates failed process records from `auditResults` for the last 30 days.
 *
 * The Firestore query only filters by date to keep indexing simple; `hasIssue` is filtered in code.
 *
 * @returns Date labels and failure counts for a line chart
 */
export async function fetchFailuresOverTime(): Promise<FailuresOverTimeData> {
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

  const resultsQuery = query(collection(db, 'auditResults'), where('date', '>=', startDateKey));
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
