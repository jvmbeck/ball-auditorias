import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { FailuresByProcessData, AuditType } from 'src/types/audit';
import { toDateKey } from 'src/utils/dateFormatting';

const PROCESS_LABELS: Record<string, string> = {
  frontEnd: 'Front End',
  lavadora: 'Lavadora',
  printer: 'Printer',
  necker: 'Necker',
  insideSpray: 'Inside Spray',
  paletizadora: 'Paletizadora',
  minsters: 'Minsters',
  bodyMakers11to14: 'Body Makers 11 a 14',
  bodyMakers15to18: 'Body Makers 15 a 18',
  bodyMakers19to23: 'Body Makers 19 a 23',
  bodyMakers24to31: 'Body Makers 24 a 31',
  printer1: 'Printer 1',
  printer2e3: 'Printer 2 e 3',
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

function getResultsCollection(type?: AuditType): string {
  if (type === 'rto') return 'rtoProcessResults';
  if (type === 'board5s') return 'board5sProcessResults';
  return 'auditResults'; // Legacy fallback
}

/**
 * Fetches failed audit results and groups them by process for the last 30 days.
 * Supports both legacy (auditResults) and dual-type collections.
 *
 * @param type Optional audit type ('rto' or 'board5s'). If omitted, uses legacy collection.
 * @returns Processed failure counts grouped by process
 */
export async function fetchFailuresByProcess(type?: AuditType): Promise<FailuresByProcessData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);
  const startDateKey = toDateKey(startDate);

  const failuresByProcess: Record<string, number> = {};

  const collectionName = getResultsCollection(type);
  const failuresQuery = query(collection(db, collectionName), where('hasIssue', '==', true));
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
