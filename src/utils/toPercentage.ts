export function toPercentage(score: number, maxPossibleScore: number): number {
  if (maxPossibleScore <= 0) {
    return 0;
  }

  return Number(((score / maxPossibleScore) * 100).toFixed(1));
}
