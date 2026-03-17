import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { FailuresByProcessData } from 'src/types/audit';
import { toDateKey } from 'src/utils/dateFormatting';

const PROCESS_LABELS: Record<string, string> = {
  frontEnd: 'Front End',
  lavadora: 'Lavadora',
  printer: 'Printer',
  necker: 'Necker',
  insideSpray: 'Inside Spray',
  paletizadora: 'Paletizadora',
};

function normalizeProcessLabel(process: string): string {
  const mapped = PROCESS_LABELS[process];
  if (mapped) {
    return mapped;
  }

  return process
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Fetches failed audit results and groups them by process for the last 30 days.
 *
 * The query filters by `hasIssue == true`; the date range is enforced in code
 * to avoid requiring a composite index.
 */
export async function fetchFailuresByProcess(): Promise<FailuresByProcessData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);
  const startDateKey = toDateKey(startDate);

  const failuresByProcess: Record<string, number> = {};

  const failuresQuery = query(collection(db, 'auditResults'), where('hasIssue', '==', true));
  const snapshots = await getDocs(failuresQuery);

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<{
      process: unknown;
      processKey: unknown;
      date: unknown;
    }>;
    const processRaw =
      typeof data.process === 'string'
        ? data.process
        : typeof data.processKey === 'string'
          ? data.processKey
          : null;
    const date = typeof data.date === 'string' ? data.date : null;

    if (!processRaw || !date || date < startDateKey) {
      return;
    }

    const processLabel = normalizeProcessLabel(processRaw);
    failuresByProcess[processLabel] = (failuresByProcess[processLabel] ?? 0) + 1;
  });

  const orderedEntries = Object.entries(failuresByProcess).sort(([, a], [, b]) => b - a);
  const labels = orderedEntries.map(([process]) => process);
  const data = orderedEntries.map(([, count]) => count);

  return {
    labels,
    data,
    countsByProcess: failuresByProcess,
    mostProblematicProcess: labels[0] ?? null,
  };
}
