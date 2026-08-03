// Date utilities for maintenance contracts. All comparisons in CST.
const CST = 'America/Chicago';

export function todayCST(): Date {
  const now = new Date();
  const cst = new Date(now.toLocaleString('en-US', { timeZone: CST }));
  cst.setHours(0, 0, 0, 0);
  return cst;
}

export function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  // Treat as date-only in CST
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export type DueBadge = 'overdue' | 'soon' | 'ok' | 'none';

export function getDueBadge(due: string | null | undefined, soonWithin = 14): DueBadge {
  const date = parseDate(due);
  if (!date) return 'none';
  const today = todayCST();
  const delta = daysBetween(date, today);
  if (delta < 0) return 'overdue';
  if (delta <= soonWithin) return 'soon';
  return 'ok';
}

export function badgeClass(b: DueBadge): string {
  switch (b) {
    case 'overdue':
      return 'bg-destructive text-destructive-foreground';
    case 'soon':
      return 'bg-amber-500 text-white';
    case 'ok':
      return 'bg-emerald-600 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function formatDate(d: string | null | undefined): string {
  const date = parseDate(d);
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function computeNextVisitDue(
  startDate: string,
  lastVisit: string | null,
  visitsPerYear: number,
): string {
  const interval = Math.max(1, Math.round(365 / Math.max(1, visitsPerYear)));
  const base = parseDate(lastVisit) ?? parseDate(startDate);
  if (!base) return startDate;
  const next = lastVisit ? addDays(base, interval) : addDays(base, 30);
  return toISODate(next);
}

export function computeNextFilterDue(lastChanged: string | null, intervalDays: number): string | null {
  const date = parseDate(lastChanged);
  if (!date) return null;
  return toISODate(addDays(date, intervalDays));
}
