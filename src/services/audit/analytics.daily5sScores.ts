import { db } from 'boot/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Daily5sScoreTrendData } from 'src/types/audit';
import { toDateKey } from 'src/utils/dateFormatting';

export const DAILY5S_MAX_SCORE = 185;

function toPercentage(score: number): number {
  return Number(((score / DAILY5S_MAX_SCORE) * 100).toFixed(1));
}

function buildDateRange(days: number): string[] {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 7;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (safeDays - 1));

  const labels: string[] = [];
  for (let index = 0; index < safeDays; index += 1) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + index);
    labels.push(toDateKey(current));
  }

  return labels;
}

export async function fetchDaily5sScoreTrend(
  turma: 'A e C' | 'B e D',
  days = 7,
): Promise<Daily5sScoreTrendData> {
  const labels = buildDateRange(days);
  const startDateKey = labels[0];

  const totalsByDate: Record<string, number> = Object.fromEntries(
    labels.map((dateKey) => [dateKey, 0]),
  );

  const scoresQuery = query(
    collection(db, 'daily5sProcessResults'),
    where('turma', '==', turma),
    where('date', '>=', startDateKey),
  );

  const snapshots = await getDocs(scoresQuery);

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<{ date: unknown; rating: unknown }>;
    const date = typeof data.date === 'string' ? data.date : null;
    const rating = typeof data.rating === 'number' ? data.rating : null;

    if (!date || !rating || !(date in totalsByDate)) {
      return;
    }

    totalsByDate[date] = (totalsByDate[date] ?? 0) + rating;
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
