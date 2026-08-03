// Parses a Mitsubishi "Accept Lead" paste (and similar label/value pastes)
// into a normalized lead record. Tolerant of:
//   - inline "Label: value" lines
//   - "Label:" on one line, value on the next
//   - markdown link wrappers: [text](mailto:x), [text](tel:x), [text](url)
// All matching is case-insensitive.

export interface ParsedMitsubishiLead {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  leadSource?: string;
  customerType?: "residential" | "commercial";
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  rooms?: string;
  bestContactMethod?: string;
  purchaseTimeline?: string;
  notes?: string;
}

const LABELS = {
  "lead name": "name",
  "lead source": "leadSource",
  "zip code": "zipCode",
  "state": "state",
  "email": "email",
  "phone": "phone",
  "customer type": "customerType",
  "when are you planning to purchase": "purchaseTimeline",
  "what is the best way to reach you": "bestContactMethod",
  "address": "address",
  "rooms": "rooms",
  "customer comments": "notes",
} as const;

type FieldKey = (typeof LABELS)[keyof typeof LABELS];

function normalizeLabel(s: string): string {
  return s
    .trim()
    .replace(/[:：]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function stripMarkdownLink(value: string): string {
  if (!value) return value;
  const v = value.trim();
  // [text](mailto:x) or [text](tel:x) — prefer the target
  const linkMatch = v.match(/^\[(.+?)\]\((.+)\)\s*$/);
  if (linkMatch) {
    const target = linkMatch[2].trim();
    if (/^mailto:/i.test(target)) return target.replace(/^mailto:/i, "").trim();
    if (/^tel:/i.test(target)) return target.replace(/^tel:/i, "").trim();
    return linkMatch[1].trim();
  }
  return v;
}

function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  let ten = digits;
  if (digits.length === 11 && digits.startsWith("1")) ten = digits.slice(1);
  if (ten.length !== 10) return raw.trim() || undefined;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function splitName(full: string): { firstName?: string; lastName?: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function splitAddress(raw: string): { addressLine1?: string; city?: string; zipCode?: string } {
  // Expected: "1808 Summit Avenue , Dallas , 75206 , United States"
  const parts = raw.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  const result: { addressLine1?: string; city?: string; zipCode?: string } = {};
  if (parts[0]) result.addressLine1 = parts[0];
  if (parts[1]) result.city = parts[1];
  // ZIP is the first 5-digit token after the city
  for (let i = 2; i < parts.length; i++) {
    const z = parts[i].match(/\b(\d{5})(?:-\d{4})?\b/);
    if (z) {
      result.zipCode = z[1];
      break;
    }
  }
  return result;
}

export function parseMitsubishiLead(raw: string): ParsedMitsubishiLead {
  const out: Record<string, string> = {};
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Build a regex that matches any known label at the start of a line.
  const labelKeys = Object.keys(LABELS) as Array<keyof typeof LABELS>;
  const labelPattern = new RegExp(
    `^(${labelKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*[:：]?\\s*(.*)$`,
    "i",
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(labelPattern);
    if (!m) continue;
    const label = normalizeLabel(m[1]);
    const field = LABELS[label as keyof typeof LABELS] as FieldKey | undefined;
    if (!field) continue;
    let value = m[2].trim();

    // If value is empty (label-only line), look at the next non-label line.
    if (!value) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (labelPattern.test(next)) break;
        value = next.trim();
        i = j; // consume this line
        break;
      }
    }
    if (!value) continue;
    value = stripMarkdownLink(value);
    out[field] = value;
  }

  const parsed: ParsedMitsubishiLead = {};

  if (out.name) Object.assign(parsed, splitName(out.name));
  if (out.email) parsed.email = out.email.trim();
  if (out.phone) parsed.phone = normalizePhone(out.phone);
  if (out.leadSource) parsed.leadSource = out.leadSource.trim();
  if (out.zipCode) {
    const z = out.zipCode.match(/\b(\d{5})\b/);
    if (z) parsed.zipCode = z[1];
  }
  if (out.state) parsed.state = out.state.trim();
  if (out.customerType) {
    const ct = out.customerType.toLowerCase();
    if (ct.includes("commercial")) parsed.customerType = "commercial";
    else if (ct.includes("residential")) parsed.customerType = "residential";
  }
  if (out.address) {
    const addr = splitAddress(out.address);
    if (addr.addressLine1) parsed.addressLine1 = addr.addressLine1;
    if (addr.city) parsed.city = addr.city;
    if (addr.zipCode && !parsed.zipCode) parsed.zipCode = addr.zipCode;
  }
  if (out.rooms) parsed.rooms = out.rooms.trim();
  if (out.bestContactMethod) parsed.bestContactMethod = out.bestContactMethod.trim();
  if (out.purchaseTimeline) parsed.purchaseTimeline = out.purchaseTimeline.trim();
  if (out.notes) parsed.notes = out.notes.trim();

  // === Regex fallbacks — only fill missing fields ===
  if (!parsed.email) {
    const m = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (m) parsed.email = m[0];
  }
  if (!parsed.phone) {
    const tel = raw.match(/tel:([+\d().\s-]+)/i);
    if (tel) {
      parsed.phone = normalizePhone(tel[1]);
    } else {
      const digits = raw.replace(/[^\d]/g, " ").match(/\b1?\d{10}\b/);
      if (digits) parsed.phone = normalizePhone(digits[0]);
    }
  }

  return parsed;
}

// Convenience: shape the parsed lead into intake_lead tool params.
export function toIntakeLeadParams(p: ParsedMitsubishiLead, defaults?: { leadSource?: string }) {
  const noteBits: string[] = [];
  if (p.purchaseTimeline) noteBits.push(`Timeline: ${p.purchaseTimeline}`);
  if (p.bestContactMethod) noteBits.push(`Best contact: ${p.bestContactMethod}`);
  if (p.rooms) noteBits.push(`Rooms: ${p.rooms}`);
  if (p.notes) noteBits.push(p.notes);

  return {
    first_name: p.firstName ?? "",
    last_name: p.lastName ?? "",
    email: p.email,
    phone: p.phone,
    address_line1: p.addressLine1,
    city: p.city,
    state: p.state && p.state.length > 2 ? "TX" : p.state,
    zip_code: p.zipCode,
    lead_source: p.leadSource || defaults?.leadSource || "Mitsubishi Partner Program",
    customer_type: p.customerType ?? "residential",
    notes: noteBits.join(" | ") || undefined,
  };
}
