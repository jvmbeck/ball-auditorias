import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  DAILY5S_ISSUE_REASONS,
  DAILY5S_PROCESS_DEFINITIONS,
  isDaily5sIssueReason,
  isDaily5sProcessKey,
} from 'src/services/audit/daily5sDefinitions';
import type {
  Daily5sCanonicalMonthlyData,
  Daily5sCanonicalRow,
  Daily5sHeatmapCategory,
  Daily5sHeatmapPoint,
  Daily5sHeatmapValue,
  Daily5sIssueAnalyticsBucket,
  Daily5sIssueAnalyticsData,
  Daily5sIssueAnalyticsSeries,
  Daily5sIssueAnalyticsViewData,
  Daily5sIssueByReasonAndTurmaData,
  Daily5sIssueReason,
  Daily5sMonthlyHeatmapData,
  Daily5sRating1ByProcessData,
  Daily5sScoreTrendData,
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
const DISPLAY_TURMAS: Daily5sTurma[] = ['B e D', 'A e C'];

export const DAILY5S_MAX_SCORE = 185;

interface DateRange {
  from: string;
  to: string;
}

function createEmptyReasonCounts(): Record<Daily5sIssueReason, number> {
  return Object.fromEntries(DAILY5S_ISSUE_REASONS.map((reason) => [reason, 0])) as Record<
    Daily5sIssueReason,
    number
  >;
}

function toDisplayDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  if (!month || !day) {
    return dateKey;
  }

  return `${day}/${month}`;
}

function toTurmaTag(turma: Daily5sTurma): string {
  return turma === 'A e C' ? 'A/C' : 'B/D';
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTimestampMs(value: unknown): number {
  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

function normalizeRating(rating: unknown, status: unknown): Daily5sHeatmapValue {
  if (rating === 1 || rating === 3 || rating === 5) {
    return rating;
  }

  if (status === 'not_updated') {
    return 1;
  }

  if (status === 'updated') {
    return 5;
  }

  return 0;
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

function buildMonthDateKeys(monthKey: string): string[] {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return [];
  }

  const daysInMonth = new Date(year, month, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return `${yearPart}-${monthPart}-${day}`;
  });
}

function buildDisplayCategories(monthKey: string): Daily5sHeatmapCategory[] {
  const dates = buildMonthDateKeys(monthKey);

  return dates.map((date, index) => {
    const turmaIndex = Math.floor(index / 5) % DISPLAY_TURMAS.length;
    const turma = DISPLAY_TURMAS[turmaIndex] ?? 'B e D';

    return {
      key: `${date}|${turma}`,
      date,
      turma,
      label: `${toDisplayDate(date)} ${toTurmaTag(turma)}`,
    };
  });
}

function toPercentage(score: number): number {
  return Number(((score / DAILY5S_MAX_SCORE) * 100).toFixed(1));
}

function normalizeRange(monthKey: string, startDateKey?: string, endDateKey?: string): DateRange {
  const { startKey, endKey } = toMonthBounds(monthKey);

  let from = isDateKey(startDateKey) ? startDateKey : startKey;
  let to = isDateKey(endDateKey) ? endDateKey : endKey;

  if (from > to) {
    [from, to] = [to, from];
  }

  return { from, to };
}

export function toMonthBounds(monthKey: string): {
  startKey: string;
  endKey: string;
  monthKey: string;
} {
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

export async function fetchDaily5sCanonicalMonthlyData(
  monthKey: string,
): Promise<Daily5sCanonicalMonthlyData> {
  const { startKey, endKey, monthKey: normalizedMonthKey } = toMonthBounds(monthKey);

  const canonicalQuery = query(
    collection(db, 'daily5sProcessResults'),
    where('date', '>=', startKey),
    where('date', '<=', endKey),
  );

  const snapshots = await getDocs(canonicalQuery);

  const rows: Daily5sCanonicalRow[] = [];

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<{
      date: unknown;
      turma: unknown;
      process: unknown;
      rating: unknown;
      status: unknown;
      hasIssue: unknown;
      comment: unknown;
      createdAt: unknown;
    }>;

    const date = typeof data.date === 'string' ? data.date : null;
    const turma = data.turma === 'A e C' || data.turma === 'B e D' ? data.turma : null;
    const process = data.process;

    if (!date || !turma || typeof process !== 'string' || !isDaily5sProcessKey(process)) {
      return;
    }

    rows.push({
      id: snapshot.id,
      date,
      turma,
      process,
      rating: normalizeRating(data.rating, data.status),
      status: data.status === 'updated' || data.status === 'not_updated' ? data.status : null,
      hasIssue: data.hasIssue === true,
      comment: isDaily5sIssueReason(data.comment) ? data.comment : null,
      createdAtMs: getTimestampMs(data.createdAt),
    });
  });

  return {
    monthKey: normalizedMonthKey,
    startKey,
    endKey,
    rows,
  };
}

export function deriveDaily5sMonthlyHeatmap(
  canonical: Daily5sCanonicalMonthlyData,
): Daily5sMonthlyHeatmapData {
  const processDefs = DAILY5S_PROCESS_DEFINITIONS;
  const processLabels = processDefs.map((definition) => definition.label);
  const processIndexByKey = new Map(
    processDefs.map((definition, index) => [definition.key, index]),
  );

  const xAxisCategories = buildDisplayCategories(canonical.monthKey);
  const displayCategoryByDate = new Map(
    xAxisCategories.map((category) => [category.date, category]),
  );

  const cellMap = new Map<string, { rating: Daily5sHeatmapValue; createdAtMs: number }>();

  canonical.rows.forEach((row) => {
    const displayCategory = displayCategoryByDate.get(row.date);
    if (!displayCategory) {
      return;
    }

    const processIndex = processIndexByKey.get(row.process);
    if (processIndex === undefined) {
      return;
    }

    const cellKey = `${row.process}|${displayCategory.key}`;
    const current = cellMap.get(cellKey);

    if (!current || row.createdAtMs >= current.createdAtMs) {
      cellMap.set(cellKey, {
        rating: row.rating,
        createdAtMs: row.createdAtMs,
      });
    }
  });

  const points: Daily5sHeatmapPoint[] = [];

  processDefs.forEach((processDef, processIndex) => {
    xAxisCategories.forEach((category, xIndex) => {
      const cellKey = `${processDef.key}|${category.key}`;
      const rating = cellMap.get(cellKey)?.rating ?? 0;
      points.push([xIndex, processIndex, rating]);
    });
  });

  return {
    monthKey: canonical.monthKey,
    processLabels,
    xAxisCategories,
    points,
  };
}

export function deriveDaily5sIssueAnalytics(
  canonical: Daily5sCanonicalMonthlyData,
  startDateKey?: string,
  endDateKey?: string,
): Daily5sIssueAnalyticsData {
  const range = normalizeRange(canonical.monthKey, startDateKey, endDateKey);

  const byTurmaTimeMap = new Map<string, Daily5sIssueAnalyticsBucket>();
  const overallMap = new Map<string, Daily5sIssueAnalyticsBucket>();
  const countsAC = createEmptyReasonCounts();
  const countsBD = createEmptyReasonCounts();

  canonical.rows.forEach((row) => {
    if (!row.hasIssue || !row.comment) {
      return;
    }

    if (row.date < range.from || row.date > range.to) {
      return;
    }

    const reason = row.comment;
    const turmaKey = `${row.date}|${row.turma}`;
    const turmaLabel = row.turma === 'A e C' ? 'A/C' : 'B/D';

    const existingTurmaBucket = byTurmaTimeMap.get(turmaKey);
    if (existingTurmaBucket) {
      existingTurmaBucket.countsByReason[reason] += 1;
      existingTurmaBucket.total += 1;
    } else {
      const reasonCounts = createEmptyReasonCounts();
      reasonCounts[reason] = 1;
      byTurmaTimeMap.set(turmaKey, {
        key: turmaKey,
        date: row.date,
        turma: row.turma,
        displayLabel: `${toDisplayDate(row.date)}\n${turmaLabel}`,
        countsByReason: reasonCounts,
        total: 1,
      });
    }

    const overallBucket = overallMap.get(row.date);
    if (overallBucket) {
      overallBucket.countsByReason[reason] += 1;
      overallBucket.total += 1;
    } else {
      const overallCounts = createEmptyReasonCounts();
      overallCounts[reason] = 1;
      overallMap.set(row.date, {
        key: row.date,
        date: row.date,
        turma: null,
        displayLabel: toDisplayDate(row.date),
        countsByReason: overallCounts,
        total: 1,
      });
    }

    if (row.turma === 'A e C') {
      countsAC[reason] += 1;
    } else {
      countsBD[reason] += 1;
    }
  });

  const byTurmaTime = buildViewData([...byTurmaTimeMap.values()]);
  const overall = buildViewData([...overallMap.values()]);

  const byReasonAndTurma: Daily5sIssueByReasonAndTurmaData = {
    reasons: [...DAILY5S_ISSUE_REASONS],
    seriesAC: DAILY5S_ISSUE_REASONS.map((reason) => countsAC[reason]),
    seriesBD: DAILY5S_ISSUE_REASONS.map((reason) => countsBD[reason]),
    grandTotal: DAILY5S_ISSUE_REASONS.reduce(
      (sum, reason) => sum + countsAC[reason] + countsBD[reason],
      0,
    ),
  };

  return {
    monthKey: canonical.monthKey,
    byTurmaTime,
    overall,
    byReasonAndTurma,
  };
}

export function deriveDaily5sMonthlyScoreTrend(
  canonical: Daily5sCanonicalMonthlyData,
  turma: Daily5sTurma,
): Daily5sScoreTrendData {
  const labels = buildMonthDateKeys(canonical.monthKey);
  const totalsByDate: Record<string, number> = Object.fromEntries(
    labels.map((dateKey) => [dateKey, 0]),
  );

  canonical.rows.forEach((row) => {
    if (row.turma !== turma || !(row.date in totalsByDate) || row.rating <= 0) {
      return;
    }

    totalsByDate[row.date] = (totalsByDate[row.date] ?? 0) + row.rating;
  });

  const totals = labels.map((date) => totalsByDate[date] ?? 0);
  const percentages = totals.map((score) => toPercentage(score));
  const percentagesByDate = Object.fromEntries(
    labels.map((date, index) => [date, percentages[index] ?? 0]),
  );

  return {
    labels,
    totals,
    percentages,
    totalsByDate,
    percentagesByDate,
  };
}

export function deriveDaily5sTopRating1ByProcess(
  canonical: Daily5sCanonicalMonthlyData,
  startDateKey?: string,
  endDateKey?: string,
  topN = 5,
): Daily5sRating1ByProcessData {
  const range = normalizeRange(canonical.monthKey, startDateKey, endDateKey);
  const countByProcess = new Map<string, number>();

  canonical.rows.forEach((row) => {
    if (row.rating !== 1 || row.date < range.from || row.date > range.to) {
      return;
    }

    const processLabel = DAILY5S_PROCESS_DEFINITIONS.find(
      (definition) => definition.key === row.process,
    )?.label;

    if (!processLabel) {
      return;
    }

    countByProcess.set(processLabel, (countByProcess.get(processLabel) ?? 0) + 1);
  });

  const sorted = [...countByProcess.entries()].sort(([, left], [, right]) => right - left);
  const sliced = sorted.slice(0, Math.max(1, Math.floor(topN)));

  return {
    labels: sliced.map(([label]) => label),
    data: sliced.map(([, value]) => value),
    total: sliced.reduce((sum, [, value]) => sum + value, 0),
  };
}
