// Parser + validator for Markdown page uploads used by /admin/seo/upload.
// Format: YAML frontmatter, then a fenced ```json JSON-LD block, then markdown body.

export interface ParsedPage {
  fileName: string;
  raw: string;
  frontmatter: Record<string, any>;
  schemaJson: any | null;
  schemaRaw: string;
  body: string;
  bodyWordCount: number;
}

export interface ValidationIssue {
  level: 'red' | 'yellow';
  code: string;
  message: string;
}

export interface ValidatedPage extends ParsedPage {
  issues: ValidationIssue[];
  canSave: boolean;
}

const REQUIRED_FM = ['url_slug', 'meta_title', 'meta_description', 'cluster', 'page_type', 'audience'];

// --- YAML frontmatter parser (minimal; handles the shapes we ship) ---
function parseYaml(src: string): Record<string, any> {
  const out: Record<string, any> = {};
  const lines = src.split('\n');
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  const stripQuotes = (v: string) => {
    const t = v.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1);
    }
    return t;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim()) continue;

    // list item
    const listMatch = line.match(/^\s+-\s+(.*)$/);
    if (listMatch && currentKey && currentList) {
      currentList.push(stripQuotes(listMatch[1]));
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2];
      if (val.trim() === '') {
        // list follows
        currentKey = key;
        currentList = [];
        out[key] = currentList;
      } else if (val.trim().startsWith('[') && val.trim().endsWith(']')) {
        const inner = val.trim().slice(1, -1);
        out[key] = inner
          ? inner.split(',').map((s) => stripQuotes(s))
          : [];
        currentKey = null;
        currentList = null;
      } else {
        out[key] = stripQuotes(val);
        currentKey = null;
        currentList = null;
      }
    }
  }
  return out;
}

export function parseFile(fileName: string, raw: string): ParsedPage {
  const fm: Record<string, any> = {};
  let body = raw;
  let schemaRaw = '';
  let schemaJson: any = null;

  // Frontmatter
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  let afterFm = raw;
  if (fmMatch) {
    Object.assign(fm, parseYaml(fmMatch[1]));
    afterFm = raw.slice(fmMatch[0].length);
  }

  // JSON-LD fenced block. Supports two shapes:
  //   ```json
  //   { ... }
  //   ```
  // and the ```html-wrapped <script type="application/ld+json"> form that the
  // page-generation spec actually emits.
  const jsonMatch = afterFm.match(/```json\s*\n([\s\S]*?)\n```/);
  const htmlScriptMatch = afterFm.match(
    /```html\s*\n<script type="application\/ld\+json">\s*\n?([\s\S]*?)\n?<\/script>\s*\n```/
  );
  const schemaMatch = jsonMatch || htmlScriptMatch;
  if (schemaMatch) {
    schemaRaw = schemaMatch[1];
    try {
      schemaJson = JSON.parse(schemaRaw);
    } catch {
      schemaJson = null;
    }
    body = afterFm.slice(0, schemaMatch.index).trim() + '\n\n' + afterFm.slice((schemaMatch.index || 0) + schemaMatch[0].length).trim();
    body = body.trim();
  } else {
    body = afterFm.trim();
  }

  // Strip HTML comments (e.g. "<!-- JSON-LD SCHEMA -->" markers above the
  // fenced json block) — they are not content and react-markdown would
  // render them as literal visible text on the live page.
  body = body.replace(/<!--[\s\S]*?-->/g, '').replace(/\n{3,}/g, '\n\n').trim();

  const bodyWordCount = body.split(/\s+/).filter(Boolean).length;

  return { fileName, raw, frontmatter: fm, schemaJson, schemaRaw, body, bodyWordCount };
}

// --- Validation ---

function hasFAQPage(schema: any): boolean {
  if (!schema) return false;
  const walk = (n: any): boolean => {
    if (!n) return false;
    if (Array.isArray(n)) return n.some(walk);
    if (typeof n !== 'object') return false;
    if (n['@type'] === 'FAQPage') return true;
    if (Array.isArray(n['@type']) && n['@type'].includes('FAQPage')) return true;
    if (Array.isArray(n['@graph'])) return n['@graph'].some(walk);
    return false;
  };
  return walk(schema);
}

function findInSchema(schema: any, key: string): string[] {
  const found: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    for (const [k, v] of Object.entries(n)) {
      if (k === key && typeof v === 'string') found.push(v);
      else if (typeof v === 'object') walk(v);
    }
  };
  walk(schema);
  return found;
}

export interface KnownSlugs {
  existing: Set<string>; // published slugs in DB
  batchSlugs: Set<string>; // slugs in this batch (for internal_links resolution)
  allDbSlugs: Set<string>; // any slug in DB (published or draft)
}

export function validatePage(p: ParsedPage, known: KnownSlugs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fm = p.frontmatter || {};
  const body = p.body || '';
  const audience = (fm.audience || '').toString().toLowerCase();

  // 10. Required frontmatter
  for (const k of REQUIRED_FM) {
    if (!fm[k] || (typeof fm[k] === 'string' && !fm[k].trim())) {
      issues.push({ level: 'red', code: 'fm_missing', message: `Frontmatter missing: ${k}` });
    }
  }

  const slug: string = (fm.url_slug || '').toString();

  // 1. Slug format
  if (slug && !/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/$/.test(slug)) {
    issues.push({ level: 'red', code: 'slug_format', message: `Slug malformed (must be /lowercase-hyphen/ with leading & trailing slash, no .html): "${slug}"` });
  }
  if (slug && /\.html/i.test(slug)) {
    issues.push({ level: 'red', code: 'slug_html', message: 'Slug contains .html' });
  }

  // 2. Slug uniqueness — only block when a PUBLISHED page already owns this slug.
  // Unpublished drafts are handled by Save Batch (updated in place).
  if (slug && known.existing.has(slug)) {
    issues.push({ level: 'red', code: 'slug_exists', message: `Slug already published: ${slug}` });
  } else if (slug && known.allDbSlugs.has(slug)) {
    issues.push({ level: 'yellow', code: 'slug_draft_exists', message: `A draft already exists for this slug — saving will update it in place.` });
  }

  // 3. Forbidden legacy phones
  if (/972-?598-?9154|\(214\)\s*974-?5338|214-?974-?5338/.test(body) || /972-?598-?9154|\(214\)\s*974-?5338|214-?974-?5338/.test(p.schemaRaw)) {
    issues.push({ level: 'red', code: 'legacy_phone', message: 'Contains forbidden legacy phone (972-598-9154 or 214-974-5338)' });
  }

  // 4. Required phone
  const hasDisplayPhone = /214-238-4349/.test(body);
  const hasTelLink = /tel:2142384349/.test(body);
  if (!hasDisplayPhone || !hasTelLink) {
    issues.push({ level: 'red', code: 'phone_missing', message: 'Body must contain "214-238-4349" AND a tel:2142384349 link' });
  }

  // 5. Dollar amounts
  const priceMatch = body.match(/\$\d/);
  if (priceMatch) {
    issues.push({ level: 'red', code: 'price', message: `Body contains dollar amount ("${priceMatch[0]}…") — pricing is not allowed` });
  }

  // 6. Oncor rebate language
  if (/oncor\s+rebate|oncor\s+program|oncor[^.\n]{0,80}(rebate|incentive|enrollment|program)/i.test(body)) {
    issues.push({ level: 'red', code: 'oncor', message: 'Contains Oncor rebate/program/incentive language' });
  }

  // 7. Prohibited urgency language
  const urgency: Array<[RegExp, string]> = [
    [/\bsame-day\b/i, 'same-day'],
    [/\bnext-day\b/i, 'next-day'],
    [/\b24\/7\b/, '24/7'],
    [/\bemergency service\b/i, 'emergency service'],
  ];
  for (const [re, label] of urgency) {
    if (re.test(body)) issues.push({ level: 'red', code: 'urgency', message: `Contains prohibited language: "${label}"` });
  }

  // 8. Warranty rule — tiers updated 2026-07-21
  // "Bumper-to-bumper" (parts AND labor) = Mitsubishi SVZ/PUZ ducted ONLY.
  // 12-yr parts & compressor brands: Mitsubishi, Fujitsu, Daikin (mini-splits).
  // 10-yr parts & compressor brands: Gree, Bosch, Goodman, Trane.
  if (audience === 'residential') {
    const twelveYrBrand = /\b(mitsubishi|fujitsu|daikin)\b/i;
    const tenYrBrand = /\b(gree|bosch|goodman|trane)\b/i;
    // Bumper-to-bumper (parts AND labor) is SVZ/PUZ ducted only.
    if (/bumper-to-bumper/i.test(body) && !/\b(svz|puz)\b/i.test(body)) {
      issues.push({ level: 'red', code: 'warranty_scope', message: '"Bumper-to-bumper" (parts AND labor) applies only to Mitsubishi SVZ/PUZ ducted units — page must mention SVZ or PUZ, or drop the claim' });
    }
    // A 12-year claim on a page that names only a 10-year brand is a false claim.
    if (/12[-\s]?year/i.test(body) && tenYrBrand.test(body) && !twelveYrBrand.test(body)) {
      issues.push({ level: 'red', code: 'warranty_tier_brand', message: 'Page claims a 12-year warranty but names a 10-year brand (Gree/Bosch/Goodman/Trane) and no 12-year brand (Mitsubishi/Fujitsu/Daikin). Those brands carry a 10-year parts & compressor warranty.' });
    }
    if (/10-year commercial/i.test(body)) {
      issues.push({ level: 'red', code: 'warranty_res_wrong', message: 'Residential page contains "10-year commercial"' });
    }
    if (!/warranty/i.test(body)) {
      issues.push({ level: 'yellow', code: 'warranty_mention', message: 'No warranty mention found — add the correct tier: 12-yr parts & compressor (Mitsubishi/Fujitsu/Daikin), 10-yr parts & compressor (Gree/Bosch/Goodman/Trane), or 12-yr bumper-to-bumper parts AND labor (Mitsubishi SVZ/PUZ ducted only).' });
    }
  } else if (audience === 'commercial') {
    if (!/10-year commercial warranty on parts and compressors/i.test(body)) {
      issues.push({ level: 'red', code: 'warranty_com_missing', message: 'Commercial page missing "10-year commercial warranty on parts and compressors"' });
    }
    if (/bumper-to-bumper/i.test(body)) {
      issues.push({ level: 'red', code: 'warranty_com_wrong', message: 'Commercial page contains "bumper-to-bumper"' });
    }
    if (/parts and labor/i.test(body)) {
      issues.push({ level: 'red', code: 'warranty_com_wrong2', message: 'Commercial page contains "parts and labor"' });
    }
  }

  // 9. JSON-LD checks
  if (!p.schemaRaw) {
    issues.push({ level: 'red', code: 'schema_missing', message: 'Missing ```json JSON-LD block' });
  } else if (!p.schemaJson) {
    issues.push({ level: 'red', code: 'schema_invalid', message: 'JSON-LD block is not valid JSON' });
  } else {
    if (!hasFAQPage(p.schemaJson)) {
      issues.push({ level: 'red', code: 'schema_no_faq', message: 'JSON-LD is missing an FAQPage entry' });
    }
    const phones = findInSchema(p.schemaJson, 'telephone');
    if (phones.length && !phones.every((v) => /214-238-4349/.test(v))) {
      issues.push({ level: 'red', code: 'schema_phone', message: `JSON-LD phone must be 214-238-4349 (found: ${phones.join(', ')})` });
    }
    const streets = findInSchema(p.schemaJson, 'streetAddress');
    if (streets.length && !streets.some((s) => /808\s+business\s+pkwy/i.test(s))) {
      issues.push({ level: 'red', code: 'schema_addr', message: `JSON-LD streetAddress must be "808 Business Pkwy" (found: ${streets.join(', ')})` });
    }
    const localities = findInSchema(p.schemaJson, 'addressLocality');
    const regions = findInSchema(p.schemaJson, 'addressRegion');
    const postals = findInSchema(p.schemaJson, 'postalCode');
    if (localities.length && !localities.some((s) => /richardson/i.test(s))) {
      issues.push({ level: 'red', code: 'schema_addr_city', message: 'JSON-LD addressLocality must be Richardson' });
    }
    if (regions.length && !regions.some((s) => /^tx$/i.test(s.trim()))) {
      issues.push({ level: 'red', code: 'schema_addr_state', message: 'JSON-LD addressRegion must be TX' });
    }
    if (postals.length && !postals.some((s) => /75081/.test(s))) {
      issues.push({ level: 'red', code: 'schema_addr_zip', message: 'JSON-LD postalCode must be 75081' });
    }
  }

  // YELLOW checks
  const metaTitle = (fm.meta_title || '').toString();
  if (metaTitle.length > 60) {
    issues.push({ level: 'yellow', code: 'meta_title_long', message: `meta_title is ${metaTitle.length} chars (max 60)` });
  }
  const metaDesc = (fm.meta_description || '').toString();
  if (metaDesc.length < 140 || metaDesc.length > 155) {
    issues.push({ level: 'yellow', code: 'meta_desc_len', message: `meta_description is ${metaDesc.length} chars (target 140–155)` });
  }
  if (!/faq/i.test(body)) {
    issues.push({ level: 'yellow', code: 'no_faq_heading', message: 'No FAQ heading found in body' });
  }
  const internalLinks: string[] = Array.isArray(fm.internal_links) ? fm.internal_links : [];
  for (const link of internalLinks) {
    const target = link.startsWith('/') ? link : `/${link}`;
    const norm = target.endsWith('/') ? target : `${target}/`;
    if (!known.existing.has(norm) && !known.batchSlugs.has(norm)) {
      issues.push({ level: 'yellow', code: 'link_void', message: `internal_link points into a void: ${link}` });
    }
  }
  if (p.bodyWordCount < 450) {
    issues.push({ level: 'yellow', code: 'short_body', message: `Body is ${p.bodyWordCount} words (target ≥ 450)` });
  }

  return issues;
}

export function validateBatch(files: ParsedPage[], known: Omit<KnownSlugs, 'batchSlugs'>): ValidatedPage[] {
  const batchSlugs = new Set(files.map((f) => (f.frontmatter?.url_slug || '').toString()).filter(Boolean));
  return files.map((f) => {
    const issues = validatePage(f, { ...known, batchSlugs });
    const canSave = !issues.some((i) => i.level === 'red');
    return { ...f, issues, canSave };
  });
}
