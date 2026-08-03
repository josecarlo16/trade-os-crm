/**
 * Gallery facets.
 *
 * The gallery_tags table is a FLAT list of tag names (no category column), so
 * we classify each tag name into one of the spec's facets here, on the client.
 * ZIPs are matched by pattern; the ~69 named tags are matched against curated
 * sets derived from the live data. Unknown future tags fall into `other` (a
 * visible catch-all) rather than being mislabelled — update the sets below (or,
 * the robust long-term fix, add a `category` column to gallery_tags) as the tag
 * vocabulary grows.
 *
 * Counts and facet lists are derived from the data at render time — never hardcoded.
 */

export type Facet =
  | 'city'
  | 'neighborhood'
  | 'zip'
  | 'systemType'
  | 'brand'
  | 'application'
  | 'service'
  | 'media'
  | 'other';

/** Order used for the More-filters panel and URL serialisation. */
export const FACET_ORDER: Facet[] = [
  'city',
  'neighborhood',
  'zip',
  'systemType',
  'brand',
  'application',
  'service',
  'other',
];

export const FACET_LABEL: Record<Facet, string> = {
  city: 'City',
  neighborhood: 'Neighborhood',
  zip: 'ZIP Code',
  systemType: 'System Type',
  brand: 'Brand',
  application: 'Application',
  service: 'Service',
  media: 'Media',
  other: 'Other',
};

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const set = (arr: string[]) => new Set(arr.map(norm));

const BRANDS = set(['Mitsubishi', 'Daikin', 'Carrier', 'Bosch', 'Trane', 'Goodman', 'Gree']);
const APPLICATIONS = set(['Residential', 'Commercial', 'New Construction', 'Remodel Project']);
const SERVICES = set(['Installation', 'Service Call', 'Maintenance', 'Before & After']);
const SYSTEM_TYPES = set([
  'Ductless', 'Ducted', 'Mini-Split', 'Heat Pump', 'AC Replacement', 'Wall Mount',
  'Floor Mounted', 'Flour Mounted', 'Ceiling Cassette - 1 way', 'Ceiling Cassette - 4 way',
  'VRF', 'Branch Box', 'Captivaire DOAS', 'Furnace', 'Spiral Duct',
]);
const CITIES = set([
  'Dallas', 'Fort Worth', 'Plano', 'Frisco', 'McKinney', 'Arlington', 'Irving', 'Garland',
  'Grand Prairie', 'Mesquite', 'Carrollton', 'Richardson', 'Allen', 'Denton', 'Lewisville',
]);
const NEIGHBORHOODS = set([
  'Oak Cliff', 'Bishop Arts', 'Uptown', 'Downtown Dallas', 'Downtown', 'Deep Ellum', 'Lakewood',
  'Lake Highlands', 'Preston Hollow', 'Highland Park', 'University Park', 'Kessler Park',
  'North Dallas', 'East Dallas', 'West Dallas', 'Lower Greenville', 'M Streets', 'Winnetka Heights',
  'Cedar Crest', 'Elmwood', 'Oak Lawn', 'Oaklawn', 'Medical District', 'Design District',
  'Love Field', 'Far North Dallas',
]);

/** Classify a flat tag name into a facet. */
export function classifyTag(name: string): Facet {
  const n = norm(name);
  if (/^\d{5}$/.test(n)) return 'zip';
  if (BRANDS.has(n)) return 'brand';
  if (CITIES.has(n)) return 'city';
  if (NEIGHBORHOODS.has(n)) return 'neighborhood';
  if (SYSTEM_TYPES.has(n)) return 'systemType';
  if (APPLICATIONS.has(n)) return 'application';
  if (SERVICES.has(n)) return 'service';
  return 'other';
}

export interface GalleryItem {
  id: string;
  title: string;
  alt: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  media: 'photo' | 'video';
  /** classified tag values per facet (excludes `media`, which is derived) */
  facets: Record<Exclude<Facet, 'media'>, string[]>;
  /** all tag names on the item (display order) */
  tagNames: string[];
}

const emptyFacets = (): GalleryItem['facets'] => ({
  city: [], neighborhood: [], zip: [], systemType: [],
  brand: [], application: [], service: [], other: [],
});

interface RawImage {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video' | null;
  alt_text: string | null;
}

/** Build the structured GalleryItem[] from the flat DB rows. */
export function buildGalleryItems(
  images: RawImage[],
  tagNameById: Map<string, string>,
  relations: { image_id: string; tag_id: string }[],
): GalleryItem[] {
  const tagsByImage = new Map<string, string[]>();
  for (const r of relations) {
    const name = tagNameById.get(r.tag_id);
    if (!name) continue;
    const arr = tagsByImage.get(r.image_id) || [];
    arr.push(name);
    tagsByImage.set(r.image_id, arr);
  }
  return images.map((img) => {
    const names = tagsByImage.get(img.id) || [];
    const facets = emptyFacets();
    for (const name of names) {
      const f = classifyTag(name) as Exclude<Facet, 'media'>;
      if (!facets[f].includes(name)) facets[f].push(name);
    }
    return {
      id: img.id,
      title: img.title,
      alt: img.alt_text || img.title,
      imageUrl: img.image_url,
      thumbnailUrl: img.thumbnail_url,
      media: img.media_type === 'video' ? 'video' : 'photo',
      facets,
      tagNames: names,
    };
  });
}

/** Values an item exposes for a facet (media is derived from media type). */
export function valuesOf(item: GalleryItem, facet: Facet): string[] {
  if (facet === 'media') return [item.media === 'video' ? 'Videos' : 'Photos'];
  return item.facets[facet as Exclude<Facet, 'media'>] || [];
}

export type Selected = Record<Facet, string[]>;

export const emptySelected = (): Selected => ({
  city: [], neighborhood: [], zip: [], systemType: [],
  brand: [], application: [], service: [], media: [], other: [],
});

/** AND across facets, OR within a facet. */
export function matches(item: GalleryItem, selected: Selected): boolean {
  return (Object.keys(selected) as Facet[]).every((f) => {
    const sel = selected[f];
    if (!sel.length) return true;
    const vals = valuesOf(item, f);
    return sel.some((v) => vals.includes(v));
  });
}

export function filterItems(items: GalleryItem[], selected: Selected): GalleryItem[] {
  return items.filter((it) => matches(it, selected));
}

/** All values for a facet across all items, with global counts. Sorted: zip asc, else count desc. */
export function facetValues(items: GalleryItem[], facet: Facet): { value: string; count: number }[] {
  const m = new Map<string, number>();
  for (const it of items) for (const v of valuesOf(it, facet)) m.set(v, (m.get(v) || 0) + 1);
  const arr = [...m.entries()].map(([value, count]) => ({ value, count }));
  arr.sort((a, b) => (facet === 'zip' ? a.value.localeCompare(b.value) : b.count - a.count));
  return arr;
}

/** Count for a value that respects selections in OTHER facets (honest combos). */
export function contextualCount(
  items: GalleryItem[],
  selected: Selected,
  facet: Facet,
  value: string,
): number {
  let n = 0;
  for (const it of items) {
    const otherOk = (Object.keys(selected) as Facet[]).every((f) => {
      if (f === facet) return true;
      const sel = selected[f];
      if (!sel.length) return true;
      return sel.some((v) => valuesOf(it, f).includes(v));
    });
    if (otherOk && valuesOf(it, facet).includes(value)) n++;
  }
  return n;
}

/** Curated high-intent chips (zero-count ones are hidden at render). */
export const POPULAR: { facet: Facet; value: string }[] = [
  { facet: 'systemType', value: 'Ductless' },
  { facet: 'systemType', value: 'Ducted' },
  { facet: 'systemType', value: 'Heat Pump' },
  { facet: 'application', value: 'Residential' },
  { facet: 'application', value: 'Commercial' },
  { facet: 'application', value: 'New Construction' },
  { facet: 'brand', value: 'Mitsubishi' },
  { facet: 'service', value: 'Before & After' },
];

/** 2–3 contextual tags for a grid tile overlay. */
export function tileTags(item: GalleryItem): string[] {
  return [item.facets.brand[0], item.facets.systemType[0], item.facets.neighborhood[0] || item.facets.city[0]]
    .filter(Boolean) as string[];
}
