import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { ProcessFailureRatesData } from 'src/types/audit';
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
 * Fetches audit result records and computes failure rate percentages by process.
 *
 * The query applies an optional date filter for the last 30 days. Failure and total
 * counts are aggregated in code to compute percentages.
 */
export async function fetchProcessFailureRates(): Promise<ProcessFailureRatesData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);
  const startDateKey = toDateKey(startDate);

  const totalsByProcess: Record<string, number> = {};
  const failuresByProcess: Record<string, number> = {};

  const resultsQuery = query(collection(db, 'auditResults'), where('date', '>=', startDateKey));
  const snapshots = await getDocs(resultsQuery);

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<{
      process: unknown;
      processKey: unknown;
      hasIssue: unknown;
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
    totalsByProcess[processLabel] = (totalsByProcess[processLabel] ?? 0) + 1;

    if (data.hasIssue === true) {
      failuresByProcess[processLabel] = (failuresByProcess[processLabel] ?? 0) + 1;
    }
  });

  const orderedEntries = Object.entries(totalsByProcess)
    .map(([processLabel, total]) => {
      const failures = failuresByProcess[processLabel] ?? 0;
      const rate = total > 0 ? (failures / total) * 100 : 0;
      return {
        processLabel,
        rate: Math.round(rate * 10) / 10,
      };
    })
    .sort((a, b) => b.rate - a.rate);

  return {
    labels: orderedEntries.map((entry) => entry.processLabel),
    data: orderedEntries.map((entry) => entry.rate),
    totalsByProcess,
    failuresByProcess,
  };
}
