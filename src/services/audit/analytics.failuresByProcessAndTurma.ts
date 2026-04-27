import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { FailuresByProcessAndTurmaData, AuditType } from 'src/types/audit';
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
  // No type → query both active collections
  return ['rtoProcessResults', 'board5sProcessResults'];
}

/**
 * Fetches failed audit results and groups them by process AND turma for the last 30 days.
 * Returns two parallel data series — one per turma — aligned to the same process labels.
 *
 * When no type is provided, queries both rtoProcessResults and board5sProcessResults.
 *
 * @param type Optional audit type ('rto' or 'board5s'). If omitted, queries all collections.
 */
export async function fetchFailuresByProcessAndTurma(
  type?: AuditType,
): Promise<FailuresByProcessAndTurmaData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);
  const startDateKey = toDateKey(startDate);

  const countsByTurma: Record<'A e C' | 'B e D', Record<string, number>> = {
    'A e C': {},
    'B e D': {},
  };

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
          turma: unknown;
        }>;

        const processRaw =
          typeof data.process === 'string'
            ? data.process
            : typeof data.processKey === 'string'
              ? data.processKey
              : null;
        const date = typeof data.date === 'string' ? data.date : null;
        const turma = data.turma === 'A e C' || data.turma === 'B e D' ? data.turma : null;

        if (!processRaw || !date || !turma || date < startDateKey) {
          return;
        }

        const processLabel = normalizeProcessLabel(processRaw);
        countsByTurma[turma][processLabel] = (countsByTurma[turma][processLabel] ?? 0) + 1;
      });
    }),
  );

  // Collect all process labels and sort by total failures descending
  const allProcesses = new Set([
    ...Object.keys(countsByTurma['A e C']),
    ...Object.keys(countsByTurma['B e D']),
  ]);

  const orderedEntries = [...allProcesses]
    .map((label) => ({
      label,
      total: (countsByTurma['A e C'][label] ?? 0) + (countsByTurma['B e D'][label] ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  const labels = orderedEntries.map((e) => e.label);
  const seriesAC = labels.map((l) => countsByTurma['A e C'][l] ?? 0);
  const seriesBD = labels.map((l) => countsByTurma['B e D'][l] ?? 0);

  return { labels, seriesAC, seriesBD };
}
