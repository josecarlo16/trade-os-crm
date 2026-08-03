// Shared helpers extracted from the legacy ductless estimator.

export const DFW_COUNTIES = [
  'Dallas',
  'Tarrant',
  'Collin',
  'Denton',
  'Rockwall',
  'Kaufman',
  'Ellis',
  'Johnson',
  'Parker',
];

export function isInServiceArea(county: string | undefined | null): boolean {
  if (!county) return false;
  const normalized = county.replace(/county/i, '').trim().toLowerCase();
  return DFW_COUNTIES.some((c) => c.toLowerCase() === normalized);
}

export function getServiceAreaDisplay(): string {
  return DFW_COUNTIES.map((c) => `${c} County`).join(', ');
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
