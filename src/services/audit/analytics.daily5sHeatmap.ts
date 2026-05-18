import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  DAILY5S_PROCESS_DEFINITIONS,
  isDaily5sProcessKey,
} from 'src/services/audit/daily5sDefinitions';
import type {
  Daily5sAuditProcessKey,
  Daily5sHeatmapCategory,
  Daily5sHeatmapPoint,
  Daily5sHeatmapValue,
  Daily5sMonthlyHeatmapData,
  Daily5sTurma,
} from 'src/types/audit';
import { toDateKey } from 'src/utils/dateFormatting';

const DISPLAY_TURMAS: Daily5sTurma[] = ['B e D', 'A e C'];

interface HeatmapSnapshotRow {
  date: string;
  turma: Daily5sTurma;
  process: Daily5sAuditProcessKey;
  rating: unknown;
  status: unknown;
  createdAtMs: number;
}

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

function toDisplayDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  if (!month || !day) {
    return dateKey;
  }

  return `${day}/${month}`;
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

function toTurmaTag(turma: Daily5sTurma): string {
  return turma === 'A e C' ? 'A/C' : 'B/D';
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

export async function fetchDaily5sMonthlyHeatmap(
  monthKey: string,
): Promise<Daily5sMonthlyHeatmapData> {
  const { startKey, endKey, monthKey: normalizedMonthKey } = toMonthBounds(monthKey);

  const processDefs = DAILY5S_PROCESS_DEFINITIONS;
  const processLabels = processDefs.map((definition) => definition.label);
  const processIndexByKey = new Map(
    processDefs.map((definition, index) => [definition.key, index]),
  );

  const heatmapQuery = query(
    collection(db, 'daily5sProcessResults'),
    where('date', '>=', startKey),
    where('date', '<=', endKey),
  );

  const snapshots = await getDocs(heatmapQuery);

  const rows: HeatmapSnapshotRow[] = [];

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<{
      date: unknown;
      turma: unknown;
      process: unknown;
      rating: unknown;
      status: unknown;
      createdAt: unknown;
    }>;

    const date = typeof data.date === 'string' ? data.date : null;
    const turma = data.turma === 'A e C' || data.turma === 'B e D' ? data.turma : null;
    const process = data.process;

    if (!date || !turma || typeof process !== 'string' || !isDaily5sProcessKey(process)) {
      return;
    }

    rows.push({
      date,
      turma,
      process,
      rating: data.rating,
      status: data.status,
      createdAtMs: getTimestampMs(data.createdAt),
    });
  });

  const xAxisCategories = buildDisplayCategories(normalizedMonthKey);

  const cellMap = new Map<string, { rating: Daily5sHeatmapValue; createdAtMs: number }>();
  const displayCategoryByDate = new Map(
    xAxisCategories.map((category) => [category.date, category]),
  );

  rows.forEach((row) => {
    const displayCategory = displayCategoryByDate.get(row.date);
    if (!displayCategory) {
      return;
    }

    const xKey = displayCategory.key;

    const processIndex = processIndexByKey.get(row.process);
    if (processIndex === undefined) {
      return;
    }

    const cellKey = `${row.process}|${xKey}`;
    const incomingCreatedAtMs = row.createdAtMs;
    const incomingRating = normalizeRating(row.rating, row.status);

    const current = cellMap.get(cellKey);
    if (!current || incomingCreatedAtMs >= current.createdAtMs) {
      cellMap.set(cellKey, {
        rating: incomingRating,
        createdAtMs: incomingCreatedAtMs,
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
    monthKey: normalizedMonthKey,
    processLabels,
    xAxisCategories,
    points,
  };
}
