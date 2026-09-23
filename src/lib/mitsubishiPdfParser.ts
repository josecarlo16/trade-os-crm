// Parses a Mitsubishi manufacturer price-sheet PDF (the specific export
// format Truficient receives, e.g. "Mitsubishi - Truficient - August
// 2026.pdf") directly in the browser, without any backend service.
//
// The PDF has several distinct table shapes across its pages; this parser
// only handles the two that map cleanly onto our existing importers:
//   1. Single-zone system tables (pages 1-5 in the reference PDF) -> System
//      Pricing (`equipment_systems`).
//   2. "Item Pricing" tables (pages 12-13) -> Individual Equipment Pricing
//      (`individual_equipment_pricing`), one row per (item id, model, price)
//      triple across the Outdoor Units / Air Handlers / Accessories columns.
// Multi-zone outdoor/indoor-unit tables and the flat accessory-description
// pages use different layouts and are intentionally left unparsed — their
// section headings are reported back in `skippedSections` so nothing is
// silently dropped.

export interface ParsedSystemRow {
  system_name: string;
  system_type: 'mini_split';
  heating_source: null;
  condenser_heat_pump_model: string | null;
  evap_coil_model: string | null;
  capacity_btuh: number | null;
  seer2: number | null;
  hspf2: number | null;
  eer2: number | null;
  ahri_number: string | null;
  system_price: number | null;
  notes: string | null;
}

export interface ParsedItemRow {
  brand: string;
  model_number: string;
  type: string;
  size: string;
  price: number;
}

export interface MitsubishiPdfParseResult {
  systems: ParsedSystemRow[];
  items: ParsedItemRow[];
  skippedSections: string[];
}

const SYSTEM_SECTION_HEADING = /SYSTEMS\s*$/i;
const ITEM_PRICING_HEADING = /ITEM ID.*MODEL.*PRICE.*ITEM ID/i;
const KNOWN_UNPARSED_HEADINGS = [
  /OUTDOOR UNITS?$/i,
  /INDOOR UNITS FOR MULTI-ZONE/i,
  /KUMO CLOUD/i,
  /CN105 INTERFACE/i,
  /MAINTENANCE TOOL/i,
  /CONTROL WIRE/i,
  /BRANCH BOX/i,
  /LOW AMBIENT ACCESSORIES/i,
  /LINESETS/i,
];

// Note: the dollar sign PRECEDES the amount in this PDF's text layout
// ("$ 1,127.30"), not the reverse.
const SYSTEM_ROW_RE =
  /^([\d,]+)\s+([\d,]+)\s+(.+?)\s+([\d.]+|N\/A)\s+([\d.]+|N\/A)\s+([\d.]+|N\/A)\s+(\d{5,})\s+\$\s*([\d,]+\.\d{2})\s*(.*)$/;

const ITEM_TRIPLE_RE = /(\d{4,8})\s+([A-Z0-9#][A-Z0-9#\-.\/]*)\s+\$\s*([\d,]+\.\d{2})/g;

function parseNumber(text: string): number | null {
  if (!text || text.trim().toUpperCase() === 'N/A') return null;
  const n = parseFloat(text.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

export async function parseMitsubishiPdf(file: File): Promise<MitsubishiPdfParseResult> {
  const { extractPdfLines } = await import('@/lib/pdfText');
  const lines = await extractPdfLines(file);

  const systems: ParsedSystemRow[] = [];
  const items: ParsedItemRow[] = [];
  const skippedSections = new Set<string>();

  let mode: 'none' | 'systems' | 'items' = 'none';

  for (const line of lines) {
    if (ITEM_PRICING_HEADING.test(line)) {
      mode = 'items';
      continue;
    }
    if (SYSTEM_SECTION_HEADING.test(line)) {
      mode = 'systems';
      continue;
    }
    if (KNOWN_UNPARSED_HEADINGS.some((re) => re.test(line))) {
      mode = 'none';
      skippedSections.add(line.trim());
      continue;
    }

    if (mode === 'systems') {
      const m = SYSTEM_ROW_RE.exec(line);
      if (!m) continue;
      const [, coolingBtu, , modelsBlob, seer2, hspf2, eer2, ahri, price, notes] = m;
      const modelTokens = modelsBlob.trim().split(/\s+/);
      const outdoorModel = modelTokens[modelTokens.length - 1] ?? null;
      const indoorModel = modelTokens[0] ?? null;
      systems.push({
        system_name: `${indoorModel ?? '?'} / ${outdoorModel ?? '?'}`,
        system_type: 'mini_split',
        heating_source: null,
        condenser_heat_pump_model: outdoorModel,
        evap_coil_model: indoorModel,
        capacity_btuh: parseNumber(coolingBtu),
        seer2: parseNumber(seer2),
        hspf2: parseNumber(hspf2),
        eer2: parseNumber(eer2),
        ahri_number: ahri,
        system_price: parseNumber(price),
        notes: notes?.trim() || null,
      });
      continue;
    }

    if (mode === 'items') {
      const columnTypes = ['Condenser', 'Air Handler', 'Other'];
      let idx = 0;
      let match: RegExpExecArray | null;
      ITEM_TRIPLE_RE.lastIndex = 0;
      while ((match = ITEM_TRIPLE_RE.exec(line)) !== null) {
        const [, , model, price] = match;
        items.push({
          brand: 'Mitsubishi',
          model_number: model,
          type: columnTypes[idx % columnTypes.length],
          size: '',
          price: parseNumber(price) ?? 0,
        });
        idx++;
      }
    }
  }

  return { systems, items, skippedSections: Array.from(skippedSections) };
}
