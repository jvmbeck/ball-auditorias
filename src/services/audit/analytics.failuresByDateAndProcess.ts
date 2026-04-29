import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { AuditType, FailuresByDateAndProcessData } from 'src/types/audit';
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
  if (mapped) return mapped;

  return process
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCollectionsToQuery(type?: AuditType): string[] {
  if (type === 'rto') return ['rtoProcessResults'];
  if (type === 'board5s') return ['board5sProcessResults'];
  return ['rtoProcessResults', 'board5sProcessResults'];
}

/**
 * Fetches issue records grouped by date and process for line-chart visualization.
 * Returns one line series per process found in the selected period.
 */
export async function fetchFailuresByDateAndProcess(
  type?: AuditType,
  days = 30,
): Promise<FailuresByDateAndProcessData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const safeDays = Math.max(days, 1);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (safeDays - 1));

  const labels: string[] = [];
  for (let index = 0; index < safeDays; index += 1) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + index);
    labels.push(toDateKey(current));
  }

  const labelsSet = new Set(labels);
  const startDateKey = labels[0] ?? toDateKey(startDate);

  const countsByProcess: Record<string, Record<string, number>> = {};
  const collectionsToQuery = getCollectionsToQuery(type);

  await Promise.all(
    collectionsToQuery.map(async (collectionName) => {
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

        if (!processRaw || !date || date < startDateKey || !labelsSet.has(date)) {
          return;
        }

        const processLabel = normalizeProcessLabel(processRaw);

        if (!countsByProcess[processLabel]) {
          countsByProcess[processLabel] = Object.fromEntries(labels.map((label) => [label, 0]));
        }

        countsByProcess[processLabel][date] = (countsByProcess[processLabel][date] ?? 0) + 1;
      });
    }),
  );

  const orderedProcesses = Object.entries(countsByProcess)
    .map(([name, counts]) => ({
      name,
      counts,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    labels,
    series: orderedProcesses.map((processEntry) => ({
      name: processEntry.name,
      data: labels.map((label) => processEntry.counts[label] ?? 0),
    })),
  };
}
