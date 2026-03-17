export function formatAuditDate(date: Date | null): string {
  if (!date) {
    return 'Unknown date';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export function formatDayOfWeek(dayOfWeek: string): string {
  const normalized = dayOfWeek.trim().toLowerCase();

  const map: Record<string, string> = {
    monday: 'segunda-feira',
    tuesday: 'terça-feira',
    wednesday: 'quarta-feira',
    thursday: 'quinta-feira',
    friday: 'sexta-feira',
    saturday: 'sábado',
    sunday: 'domingo',
  };

  return map[normalized] ?? (normalized || '-');
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
