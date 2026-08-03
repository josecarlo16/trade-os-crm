/**
 * Daily-rotating featured gallery photos.
 * Deterministic by CST date so all visitors see the same 8 on a given day.
 */

const FEATURED_PER_DAY = 8;

function getCSTDayOfYear(): number {
  // Get current date in Central Time (handles CST/CDT)
  const cstString = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const cstDate = new Date(cstString);
  const start = new Date(cstDate.getFullYear(), 0, 0);
  const diff = cstDate.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Pick today's window of featured IDs from the pool, wrapping around.
 * Pool ≤ count → returns the whole pool (no rotation).
 */
export function getTodaysFeaturedIds(
  featuredIds: string[],
  count: number = FEATURED_PER_DAY
): string[] {
  if (featuredIds.length === 0) return [];
  if (featuredIds.length <= count) return featuredIds;

  const day = getCSTDayOfYear();
  const start = (day * count) % featuredIds.length;
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(featuredIds[(start + i) % featuredIds.length]);
  }
  return result;
}

export { FEATURED_PER_DAY };
