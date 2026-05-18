import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DAILY5S_ISSUE_REASONS, isDaily5sIssueReason } from './daily5sDefinitions';
import type {
  Daily5sIssueAnalyticsBucket,
  Daily5sIssueAnalyticsData,
  Daily5sIssueAnalyticsSeries,
  Daily5sIssueAnalyticsViewData,
  Daily5sIssueByReasonAndTurmaData,
  Daily5sIssueReason,
  Daily5sTurma,
} from 'src/types/audit';
import { toDateKey } from 'src/utils/dateFormatting';

const ISSUE_REASON_COLORS: Record<Daily5sIssueReason, string> = {
  'Latas acumuladas': '#d64545',
  'Sujeira no Piso': '#f1c453',
  'Sujeira nas Máquinas': '#1f5d98',
  Desorganização: '#2e9f5f',
};

const TURMA_ORDER: Daily5sTurma[] = ['A e C', 'B e D'];

function toMonthBounds(monthKey: string): { startKey: string; endKey: string; monthKey: string } {
  const valid = /^\d{4}-\d{2}$/.test(monthKey);
  const base = valid ? `${monthKey}-01` : `${toDateKey(new Date()).slice(0, 7)}-01`;

  const monthDate = new Date(`${base}T00:00:00`);
  monthDate.setHours(0, 0, 0, 0);

  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  const normalizedMonthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

  return {
    startKey: toDateKey(monthStart),
    endKey: toDateKey(monthEnd),
    monthKey: normalizedMonthKey,
  };
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDateBounds(
  monthKey: string,
  startDateKey?: string,
  endDateKey?: string,
): { startKey: string; endKey: string; monthKey: string } {
  const fallback = toMonthBounds(monthKey);
  let startKey = isDateKey(startDateKey) ? startDateKey : fallback.startKey;
  let endKey = isDateKey(endDateKey) ? endDateKey : fallback.endKey;

  if (startKey > endKey) {
    [startKey, endKey] = [endKey, startKey];
  }

  return {
    startKey,
    endKey,
    monthKey: startKey.slice(0, 7),
  };
}

function toDisplayDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  if (!month || !day) {
    return dateKey;
  }

  return `${day}/${month}`;
}

function createEmptyReasonCounts(): Record<Daily5sIssueReason, number> {
  return Object.fromEntries(DAILY5S_ISSUE_REASONS.map((reason) => [reason, 0])) as Record<
    Daily5sIssueReason,
    number
  >;
}

function sortBuckets(
  left: Daily5sIssueAnalyticsBucket,
  right: Daily5sIssueAnalyticsBucket,
): number {
  const byDate = left.date.localeCompare(right.date);
  if (byDate !== 0) {
    return byDate;
  }

  if (left.turma && right.turma) {
    return TURMA_ORDER.indexOf(left.turma) - TURMA_ORDER.indexOf(right.turma);
  }

  return 0;
}

function buildViewData(buckets: Daily5sIssueAnalyticsBucket[]): Daily5sIssueAnalyticsViewData {
  const orderedBuckets = [...buckets].sort(sortBuckets);

  const labels = orderedBuckets.map((bucket) => bucket.key);
  const series: Daily5sIssueAnalyticsSeries[] = DAILY5S_ISSUE_REASONS.map((reason) => ({
    key: reason,
    label: reason,
    color: ISSUE_REASON_COLORS[reason],
    data: orderedBuckets.map((bucket) => bucket.countsByReason[reason] ?? 0),
  }));

  return {
    labels,
    buckets: orderedBuckets,
    series,
    grandTotal: orderedBuckets.reduce((sum, bucket) => sum + bucket.total, 0),
  };
}

export async function fetchDaily5sIssueAnalytics(
  monthKey: string,
  startDateKey?: string,
  endDateKey?: string,
): Promise<Daily5sIssueAnalyticsData> {
  const {
    startKey,
    endKey,
    monthKey: normalizedMonthKey,
  } = toDateBounds(monthKey, startDateKey, endDateKey);

  const issuesQuery = query(
    collection(db, 'daily5sProcessResults'),
    where('date', '>=', startKey),
    where('date', '<=', endKey),
    where('hasIssue', '==', true),
  );

  const snapshots = await getDocs(issuesQuery);

  const byTurmaTimeMap = new Map<string, Daily5sIssueAnalyticsBucket>();
  const overallMap = new Map<string, Daily5sIssueAnalyticsBucket>();
  const countsAC = createEmptyReasonCounts();
  const countsBD = createEmptyReasonCounts();

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<{
      date: unknown;
      turma: unknown;
      comment: unknown;
      hasIssue: unknown;
    }>;

    if (data.hasIssue !== true) {
      return;
    }

    const date = typeof data.date === 'string' ? data.date : null;
    const turma = data.turma === 'A e C' || data.turma === 'B e D' ? data.turma : null;
    const reason = isDaily5sIssueReason(data.comment) ? data.comment : null;

    if (!date || !turma || !reason) {
      return;
    }

    const reasonCounts = createEmptyReasonCounts();
    const turmaKey = `${date}|${turma}`;
    const turmaLabel = turma === 'A e C' ? 'A/C' : 'B/D';

    const existingTurmaBucket = byTurmaTimeMap.get(turmaKey);
    if (existingTurmaBucket) {
      existingTurmaBucket.countsByReason[reason] += 1;
      existingTurmaBucket.total += 1;
    } else {
      reasonCounts[reason] = 1;
      byTurmaTimeMap.set(turmaKey, {
        key: turmaKey,
        date,
        turma,
        displayLabel: `${toDisplayDate(date)}\n${turmaLabel}`,
        countsByReason: reasonCounts,
        total: 1,
      });
    }

    const overallBucket = overallMap.get(date);
    if (overallBucket) {
      overallBucket.countsByReason[reason] += 1;
      overallBucket.total += 1;
    } else {
      const overallCounts = createEmptyReasonCounts();
      overallCounts[reason] = 1;
      overallMap.set(date, {
        key: date,
        date,
        turma: null,
        displayLabel: toDisplayDate(date),
        countsByReason: overallCounts,
        total: 1,
      });
    }

    if (turma === 'A e C') {
      countsAC[reason] += 1;
    } else {
      countsBD[reason] += 1;
    }
  });

  const byTurmaTime = buildViewData([...byTurmaTimeMap.values()]);
  const overall = buildViewData([...overallMap.values()]);

  const byReasonAndTurma: Daily5sIssueByReasonAndTurmaData = {
    reasons: [...DAILY5S_ISSUE_REASONS],
    seriesAC: DAILY5S_ISSUE_REASONS.map((r) => countsAC[r]),
    seriesBD: DAILY5S_ISSUE_REASONS.map((r) => countsBD[r]),
    grandTotal: DAILY5S_ISSUE_REASONS.reduce((sum, r) => sum + countsAC[r] + countsBD[r], 0),
  };

  return {
    monthKey: normalizedMonthKey,
    byTurmaTime,
    overall,
    byReasonAndTurma,
  };
}
