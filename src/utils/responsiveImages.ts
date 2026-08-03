/**
 * Builds srcSet and sizes attributes for responsive images.
 * Each entry maps a width-descriptor to an imported image URL.
 */
export function buildSrcSet(variants: Record<string, string>): string {
  return Object.entries(variants)
    .map(([descriptor, url]) => `${url} ${descriptor}`)
    .join(', ');
}
