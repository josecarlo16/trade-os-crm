/**
 * CST Timezone Utilities
 * Forces all date/time handling to America/Chicago timezone,
 * regardless of the user's browser timezone.
 */

const TZ = 'America/Chicago';

/**
 * Format a Date (or ISO string) into CST date and time parts.
 * Returns { date: "YYYY-MM-DD", time: "HH:mm" } in CST.
 */
export function formatInCST(input: Date | string): { date: string; time: string } {
  const d = typeof input === 'string' ? new Date(input) : input;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const date = `${get('year')}-${get('month')}-${get('day')}`;
  // Intl may return "24" for midnight; normalise to "00"
  const hour = get('hour') === '24' ? '00' : get('hour');
  const time = `${hour}:${get('minute')}`;

  return { date, time };
}

/**
 * Build a UTC ISO string from a date string + time string that the user
 * intended as CST (America/Chicago).
 *
 * Strategy: create a Date in UTC that we *know* maps to the wall-clock
 * time the user typed.  We do this by:
 *  1. Build a rough Date from the naive string (will be in browser TZ).
 *  2. Use Intl to discover the UTC offset for America/Chicago at that instant.
 *  3. Re-construct the correct UTC timestamp.
 */
export function buildCSTDateTime(dateStr: string, timeStr: string): string {
  // Parse the user-entered wall-clock time as a naive date
  const naive = new Date(`${dateStr}T${timeStr}:00`);

  // Discover the CST offset at roughly this date.
  // We format both UTC and CST representations and diff them.
  const utcStr = naive.toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
  const cstStr = naive.toLocaleString('en-US', { timeZone: TZ, hour12: false });

  const utcDate = new Date(utcStr);
  const cstDate = new Date(cstStr);
  const offsetMs = utcDate.getTime() - cstDate.getTime(); // offset CST is behind UTC

  // The user typed dateStr + timeStr meaning CST wall-clock.
  // Construct a Date object representing that exact moment in UTC.
  // "2026-02-10T10:00:00" should be interpreted as 10:00 CST → 16:00 UTC (CST = UTC-6)
  const cstEpoch = new Date(`${dateStr}T${timeStr}:00Z`); // treat as UTC temporarily
  const corrected = new Date(cstEpoch.getTime() + offsetMs); // shift by CST offset

  return corrected.toISOString();
}

/**
 * Format a Date in CST for display purposes (e.g. "10:30 AM").
 */
export function formatTimeCSTDisplay(input: Date | string, fmt: string = 'h:mm a'): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleString('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get hours and minutes of a Date in CST (for positioning on calendar grid).
 */
export function getCSTHoursMinutes(input: Date | string): { hours: number; minutes: number } {
  const d = typeof input === 'string' ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  const hours = get('hour') === 24 ? 0 : get('hour');
  return { hours, minutes: get('minute') };
}
