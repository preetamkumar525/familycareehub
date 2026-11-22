export type RefillStatus = 'none' | 'ok' | 'due_soon' | 'overdue';

const DAY_MS = 86400000;

function toUtcMs(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

// Whole days from `from` to `to`. Both are 'YYYY-MM-DD'. Positive when `to` is later.
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

// refillDate and today are 'YYYY-MM-DD'.
export function refillStatus(refillDate: string | null, today: string): RefillStatus {
  if (!refillDate) {
    return 'none';
  }
  const days = daysBetween(today, refillDate);
  if (days < 0) {
    return 'overdue';
  }
  if (days <= 7) {
    return 'due_soon';
  }
  return 'ok';
}

// Today's date in local time, formatted 'YYYY-MM-DD'.
export function todayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
