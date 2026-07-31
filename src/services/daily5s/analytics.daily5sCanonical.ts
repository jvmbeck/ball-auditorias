import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DAILY5S_PROCESS_ROSTER } from 'src/data/daily5sProcessRoster';
import {
  DAILY5S_ISSUE_REASONS,
  DAILY5S_PROCESS_DEFINITIONS,
  DAILY5S_PROCESS_LABELS,
  isDaily5sIssueReason,
  isDaily5sProcessKey,
} from 'src/services/daily5s/daily5sDefinitions';
import type {
  Daily5sActionPlanData,
  Daily5sActionPlanRow,
  Daily5sAuditProcessKey,
  Daily5sCanonicalMonthlyData,
  Daily5sCanonicalRow,
  Daily5sHeatmapCategory,
  Daily5sHeatmapPoint,
  Daily5sHeatmapValue,
  Daily5sIssueAnalyticsBucket,
  Daily5sIssueAnalyticsData,
  Daily5sIssueAnalyticsSeries,
  Daily5sIssueAnalyticsViewData,
  Daily5sIssueByProcessData,
  Daily5sIssueByReasonAndTurmaData,
  Daily5sIssueReason,
  Daily5sMonthlyHeatmapData,
  Daily5sRatingValue,
  Daily5sRating1ByProcessData,
  Daily5sScoreTrendData,
  AuditTurma,
} from 'src/types/audit';
import { ACTION_OWNER_BY_REASON } from 'src/types/actionPlans';
import { toDateKey } from 'src/utils/dateFormatting';
import type { Daily5sAuditDocument } from 'src/types/daily5sDocuments';

const ISSUE_REASON_COLORS: Record<Daily5sIssueReason, string> = {
  'Latas acumuladas': '#d64545',
  'Sujeira no Piso': '#f1c453',
  'Sujeira nas Máquinas': '#1f5d98',
  Desorganização: '#2e9f5f',
};

const TURMA_ORDER: AuditTurma[] = ['A e C', 'B e D'];

// Reference date: the first day of an A e C 4-day block.
// The cycle repeats every 8 days (4 days A e C, then 4 days B e D).
const TURMA_EPOCH = '2026-06-29'; // A e C block starts here

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

function toTurmaTag(turma: AuditTurma): string {
  return turma === 'A e C' ? 'A/C' : 'B/D';
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
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

function normalizeReasons(grade1Reason: unknown, legacyComment: unknown): Daily5sIssueReason[] {
  const normalized = new Set<Daily5sIssueReason>();
  if (Array.isArray(grade1Reason)) {
    grade1Reason.forEach((value) => {
      if (isDaily5sIssueReason(value)) {
        normalized.add(value);
      }
    });
  } else if (isDaily5sIssueReason(grade1Reason)) {
    normalized.add(grade1Reason);
  }

  if (normalized.size === 0 && isDaily5sIssueReason(legacyComment)) {
    normalized.add(legacyComment);
  }

  return [...normalized];
}

function normalizeAggregateGrades(
  value: unknown,
): Partial<Record<Daily5sAuditProcessKey, Daily5sRatingValue>> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const normalized: Partial<Record<Daily5sAuditProcessKey, Daily5sRatingValue>> = {};

  Object.entries(value as Record<string, unknown>).forEach(([processKey, grade]) => {
    if (!isDaily5sProcessKey(processKey)) {
      return;
    }

    if (grade === 1 || grade === 3 || grade === 5) {
      normalized[processKey] = grade;
    }
  });

  return normalized;
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

export function getTurmaForDate(dateKey: string): AuditTurma {
  const epochMs = new Date(`${TURMA_EPOCH}T00:00:00`).getTime();
  const dateMs = new Date(`${dateKey}T00:00:00`).getTime();
  const daysSinceEpoch = Math.round((dateMs - epochMs) / 86_400_000);
  const blockIndex = Math.floor(daysSinceEpoch / 4) % 2;
  return blockIndex === 0 ? 'A e C' : 'B e D';
}

function buildDisplayCategories(monthKey: string): Daily5sHeatmapCategory[] {
  const dates = buildMonthDateKeys(monthKey);

  return dates.map((date) => {
    const turma = getTurmaForDate(date);

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
      grade1Reason: unknown;
      comment: unknown;
      createdAt: unknown;
    }>;

    const date = typeof data.date === 'string' ? data.date : null;
    const turma = data.turma === 'A e C' || data.turma === 'B e D' ? data.turma : null;
    const process = data.process;

    if (!date || !turma || typeof process !== 'string' || !isDaily5sProcessKey(process)) {
      return;
    }

    const reasons = normalizeReasons(data.grade1Reason, data.comment);

    rows.push({
      date,
      turma,
      process,
      rating: normalizeRating(data.rating, data.status),
      grade1Reason: reasons,
    });
  });

  return {
    monthKey: normalizedMonthKey,
    startKey,
    endKey,
    rows,
  };
}

export async function fetchDaily5sAggregatedMonthlyData(
  monthKey: string,
): Promise<Daily5sCanonicalMonthlyData> {
  const { startKey, endKey, monthKey: normalizedMonthKey } = toMonthBounds(monthKey);

  const auditsQuery = query(
    collection(db, 'daily5sAudits'),
    where('date', '>=', startKey),
    where('date', '<=', endKey),
  );
  const auditSnapshots = await getDocs(auditsQuery);

  const rows: Daily5sCanonicalRow[] = [];

  for (const snapshot of auditSnapshots.docs) {
    const data = snapshot.data() as Partial<Daily5sAuditDocument>;
    const date = typeof data.date === 'string' ? data.date : null;
    const turma = data.turma === 'A e C' || data.turma === 'B e D' ? data.turma : null;

    if (!date || !turma) {
      continue;
    }

    const aggregateGrades = normalizeAggregateGrades(data.aggregateGrades);

    Object.entries(aggregateGrades).forEach(([processKey, rating]) => {
      if (!isDaily5sProcessKey(processKey) || (rating !== 1 && rating !== 3 && rating !== 5)) {
        return;
      }

      rows.push({
        date,
        turma,
        process: processKey,
        rating,
        grade1Reason: [],
      });
    });
  }

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
  const processKeys = processDefs.map((definition) => definition.key);
  const processIndexByKey = new Map(
    processDefs.map((definition, index) => [definition.key, index]),
  );

  const xAxisCategories = buildDisplayCategories(canonical.monthKey);
  const displayCategoryByDate = new Map(
    xAxisCategories.map((category) => [category.date, category]),
  );

  const cellMap = new Map<string, Daily5sHeatmapValue>();

  canonical.rows.forEach((row) => {
    const displayCategory = displayCategoryByDate.get(row.date);
    if (!displayCategory) {
      return;
    }

    if (!processIndexByKey.has(row.process)) {
      return;
    }

    const cellKey = `${row.process}|${displayCategory.key}`;
    cellMap.set(cellKey, row.rating);
  });

  const points: Daily5sHeatmapPoint[] = [];

  processDefs.forEach((processDef, processIndex) => {
    xAxisCategories.forEach((category, xIndex) => {
      const cellKey = `${processDef.key}|${category.key}`;
      const rating = cellMap.get(cellKey) ?? 0;
      points.push([xIndex, processIndex, rating]);
    });
  });

  return {
    monthKey: canonical.monthKey,
    processLabels,
    processKeys,
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
  const countsByProcess = new Map(
    DAILY5S_PROCESS_DEFINITIONS.map((definition) => [
      definition.key,
      {
        seriesAC: createEmptyReasonCounts(),
        seriesBD: createEmptyReasonCounts(),
      },
    ]),
  );

  canonical.rows.forEach((row) => {
    if (row.date < range.from || row.date > range.to) {
      return;
    }

    if (row.rating !== 1 || row.grade1Reason.length === 0) {
      return;
    }

    row.grade1Reason.forEach((reason) => {
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

      const processCounts = countsByProcess.get(row.process);
      if (processCounts) {
        if (row.turma === 'A e C') {
          processCounts.seriesAC[reason] += 1;
        } else {
          processCounts.seriesBD[reason] += 1;
        }
      }
    });
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

  const byProcess: Daily5sIssueByProcessData = {
    reasons: [...DAILY5S_ISSUE_REASONS],
    processes: DAILY5S_PROCESS_DEFINITIONS.map((definition) => {
      const processCounts = countsByProcess.get(definition.key);
      const seriesAC = DAILY5S_ISSUE_REASONS.map((reason) => processCounts?.seriesAC[reason] ?? 0);
      const seriesBD = DAILY5S_ISSUE_REASONS.map((reason) => processCounts?.seriesBD[reason] ?? 0);

      return {
        processKey: definition.key,
        seriesAC,
        seriesBD,
        total: [...seriesAC, ...seriesBD].reduce((sum, value) => sum + value, 0),
      };
    }),
    grandTotal: byReasonAndTurma.grandTotal,
  };

  return {
    monthKey: canonical.monthKey,
    byTurmaTime,
    overall,
    byReasonAndTurma,
    byProcess,
  };
}

export function deriveDaily5sMonthlyScoreTrend(
  canonical: Daily5sCanonicalMonthlyData,
  turma: AuditTurma,
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

export function deriveDaily5sActionPlan(
  canonical: Daily5sCanonicalMonthlyData,
  startDateKey?: string,
  endDateKey?: string,
): Daily5sActionPlanData {
  const range = normalizeRange(canonical.monthKey, startDateKey, endDateKey);

  const rows: Daily5sActionPlanRow[] = canonical.rows
    .filter(
      (row) =>
        row.rating === 1 &&
        row.grade1Reason.length > 0 &&
        row.date >= range.from &&
        row.date <= range.to,
    )
    .flatMap((row) =>
      row.grade1Reason.map((reason) => {
        const roster = DAILY5S_PROCESS_ROSTER[row.process];

        return {
          id: `${row.date}_${row.turma}_${row.process}_${reason}`,
          date: row.date,
          turma: row.turma,
          process: DAILY5S_PROCESS_LABELS[row.process] ?? row.process,
          auditor: roster?.auditor || 'A definir',
          processResponsible: roster?.responsible || 'A definir',
          reason,
          whoShouldAct: ACTION_OWNER_BY_REASON[reason] ?? 'Não definido',
        };
      }),
    );

  rows.sort((left, right) => {
    const byDate = right.date.localeCompare(left.date);
    if (byDate !== 0) {
      return byDate;
    }

    const byTurma = left.turma.localeCompare(right.turma);
    if (byTurma !== 0) {
      return byTurma;
    }

    return left.process.localeCompare(right.process, 'pt-BR');
  });

  return {
    rows,
    total: rows.length,
  };
}
