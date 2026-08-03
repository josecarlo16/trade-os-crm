// Single source of truth for creating/updating equipment_pages rows.
// Enforces dedupe rule: one row per unique (brand, model_number).
// Public-callable (matches decode-equipment / Step6 scanner pattern) but
// strictly validated. Admin actions (manual add) should pass an Authorization
// header; admins/managers bypass the lightweight per-IP rate limit.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// Allow real-world AI brand outputs like "Champion (York/JCI)", "Gree / Livo+",
// "Daikin, Goodman/Amana (CHPE brand)". Still excludes <>{}[]"'`;\ etc.
const SAFE_BRAND_RE = /^[A-Za-z0-9 .&,()+\-/]+$/;
const SAFE_MODEL_RE = /^[A-Za-z0-9 .\-/]+$/;
const SUSPICIOUS_RE =
  /(<script|<\/script|javascript:|onerror=|onload=|select\s+.*\s+from|union\s+select|drop\s+table|insert\s+into|update\s+.*\s+set|--\s|;\s*--|https?:\/\/)/i;

const safeText = (label: string, max: number) =>
  z
    .string()
    .min(1, `${label} required`)
    .max(max, `${label} too long`)
    .refine((v) => !SUSPICIOUS_RE.test(v), {
      message: `${label} contains disallowed pattern`,
    });

const InputSchema = z.object({
  // Identity
  brand: safeText("brand", 50)
    .refine((v) => SAFE_BRAND_RE.test(v), { message: "brand has invalid characters" })
    .refine((v) => v.trim().length >= 2, { message: "brand too short" }),
  model_number: safeText("model_number", 40)
    .refine((v) => SAFE_MODEL_RE.test(v), {
      message: "model_number has invalid characters",
    })
    .refine((v) => v.replace(/\s+/g, "").length >= 3, {
      message: "model_number too short",
    }),

  // Source
  source: z.enum([
    "scanner",
    "estimate",
    "workedge_extraction",
    "manual",
    "admin_estimator",
  ]),
  source_confidence: z.number().min(0).max(1).optional(),

  // Specs (all optional, all light)
  equipment_type: safeText("equipment_type", 60).optional(),
  tier: z.enum(["good", "better", "best", "elite"]).optional(),
  market_segment: z
    .enum(["residential", "commercial", "both"])
    .optional()
    .default("residential"),
  type_descriptor: safeText("type_descriptor", 120).optional(),
  stages: z.enum(["single", "two", "variable"]).optional(),
  tonnage: z.union([z.number(), z.string().max(20)]).optional(),
  seer_rating: z.union([z.number(), z.string().max(10)]).optional(),
  seer2_rating: z.number().optional(),
  hspf_rating: z.number().optional(),
  refrigerant: safeText("refrigerant", 20).optional(),
  manufactured_year: z.number().int().min(1950).max(2100).optional(),
  voltage_info: safeText("voltage_info", 60).optional(),
  breaker_size: z.union([z.number(), z.string().max(20)]).optional(),
  fan_motor_info: safeText("fan_motor_info", 80).optional(),
  compressor_info: safeText("compressor_info", 80).optional(),
  factory_charge: safeText("factory_charge", 40).optional(),

  // Install context
  install_city: safeText("install_city", 80).optional(),
  install_zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  install_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  job_id: z.string().uuid().optional(),
  serial_numbers: z.array(safeText("serial", 40)).max(20).optional(),

  increment_times_searched: z.boolean().optional(),
});

type Input = z.infer<typeof InputSchema>;

// ---------------------------------------------------------------------------
// Brand alias map (canonicalize known variants)
// ---------------------------------------------------------------------------

const BRAND_ALIASES: Record<string, string> = {
  mitsubishi: "Mitsubishi Electric",
  "mitsubishi electric": "Mitsubishi Electric",
  "american std": "American Standard",
  "american standard": "American Standard",
  carrier: "Carrier",
  trane: "Trane",
  lennox: "Lennox",
  goodman: "Goodman",
  amana: "Amana",
  rheem: "Rheem",
  ruud: "Ruud",
  daikin: "Daikin",
  bryant: "Bryant",
  york: "York",
  bosch: "Bosch",
  lg: "LG",
  samsung: "Samsung",
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeBrand(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const lower = trimmed.toLowerCase();
  if (BRAND_ALIASES[lower]) return BRAND_ALIASES[lower];
  return titleCase(trimmed);
}

function normalizeModel(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

function buildSlug(brand: string, model: string): string {
  const clean = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  return `${clean(brand)}-${clean(model)}`;
}

// ---------------------------------------------------------------------------
// Lightweight in-memory rate limit (best-effort; resets on cold start)
// ---------------------------------------------------------------------------

const RATE_BUCKET = new Map<string, { minute: number[]; hour: number[] }>();
const MIN_LIMIT = 10;
const HOUR_LIMIT = 100;

function rateLimitCheck(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = RATE_BUCKET.get(ip) ?? { minute: [], hour: [] };
  bucket.minute = bucket.minute.filter((t) => now - t < 60_000);
  bucket.hour = bucket.hour.filter((t) => now - t < 3_600_000);
  if (bucket.minute.length >= MIN_LIMIT) {
    RATE_BUCKET.set(ip, bucket);
    return { ok: false, retryAfter: 60 };
  }
  if (bucket.hour.length >= HOUR_LIMIT) {
    RATE_BUCKET.set(ip, bucket);
    return { ok: false, retryAfter: 3600 };
  }
  bucket.minute.push(now);
  bucket.hour.push(now);
  RATE_BUCKET.set(ip, bucket);
  return { ok: true, retryAfter: 0 };
}

// ---------------------------------------------------------------------------
// Confidence per source (used when caller doesn't supply one)
// ---------------------------------------------------------------------------

const DEFAULT_CONFIDENCE: Record<Input["source"], number> = {
  scanner: 0.9,
  estimate: 0.85,
  workedge_extraction: 0.7,
  manual: 1.0,
  admin_estimator: 0.95,
};

// ---------------------------------------------------------------------------
// Spec field mapping: incoming key -> column name (when the column exists)
// All incoming spec fields are ALSO mirrored into specs JSONB for backward
// compatibility with EquipmentDetail.tsx which reads from specs.
// ---------------------------------------------------------------------------

const SPEC_COLUMNS = new Set([
  "tonnage",
  "refrigerant",
  "seer2_rating",
  "hspf_rating",
  "stages",
]);

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Detect privileged caller (admin/manager) -> bypass rate limit
    let isPrivileged = false;
    let actorId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData } = await userClient.auth.getClaims(token);
        if (claimsData?.claims?.sub) {
          actorId = claimsData.claims.sub as string;
          const admin = createClient(supabaseUrl, serviceKey);
          const { data: roles } = await admin
            .from("user_roles")
            .select("role")
            .eq("user_id", actorId);
          isPrivileged = !!roles?.some((r: { role: string }) =>
            ["admin", "manager", "super_admin"].includes(r.role),
          );
        }
      } catch (err) {
        console.warn("auth check failed (treating as anon):", err);
      }
    }

    if (!isPrivileged) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const rl = rateLimitCheck(ip);
      if (!rl.ok) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", retry_after: rl.retryAfter }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": String(rl.retryAfter),
            },
          },
        );
      }
    }

    // Parse + validate
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const input = parsed.data;

    // Normalize identity
    const brand = normalizeBrand(input.brand);
    const model_number = normalizeModel(input.model_number);
    const slug = buildSlug(brand, model_number);
    const incomingConfidence =
      input.source_confidence ?? DEFAULT_CONFIDENCE[input.source];

    const supabase = createClient(supabaseUrl, serviceKey);

    // ----- LOOKUP: by (brand, model) OR by canonical slug -----
    const { data: existingRows, error: lookupErr } = await supabase
      .from("equipment_pages")
      .select("*")
      .or(`and(brand.eq.${brand},model_number.eq.${model_number}),slug.eq.${slug}`)
      .limit(2);

    if (lookupErr) {
      console.error("lookup error:", lookupErr);
      return new Response(
        JSON.stringify({ error: "Lookup failed", details: lookupErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const existing = existingRows?.[0];

    // ----- Build incoming specs object (mirrors top-level fields into JSONB) -----
    const incomingSpecFields: Record<string, unknown> = {
      tonnage: input.tonnage ?? null,
      refrigerant: input.refrigerant ?? null,
      seer_rating: input.seer_rating ?? null,
      seer2_rating: input.seer2_rating ?? null,
      hspf_rating: input.hspf_rating ?? null,
      stages: input.stages ?? null,
      voltage_info: input.voltage_info ?? null,
      breaker_size: input.breaker_size ?? null,
      fan_motor_info: input.fan_motor_info ?? null,
      compressor_info: input.compressor_info ?? null,
      factory_charge: input.factory_charge ?? null,
      manufactured_year: input.manufactured_year ?? null,
    };

    // Strip nulls for clean comparisons
    const cleanIncomingSpecs = Object.fromEntries(
      Object.entries(incomingSpecFields).filter(([, v]) => v !== null && v !== undefined),
    );

    if (existing) {
      // ====== UPDATE PATH ======
      const updates: Record<string, unknown> = {};
      const conflictsToLog: Array<{
        field: string;
        existing: unknown;
        incoming: unknown;
        resolution: "kept_existing" | "overwrote";
      }> = [];

      const existingSpecs = (existing.specs as Record<string, unknown>) ?? {};
      const mergedSpecs: Record<string, unknown> = { ...existingSpecs };

      // Track an "effective confidence" per existing row (stored in specs._source_confidence by default)
      const existingConfidence =
        typeof existingSpecs._source_confidence === "number"
          ? (existingSpecs._source_confidence as number)
          : 0.5;

      // Top-level columns: equipment_type, tier, market_segment, type_descriptor,
      // refrigerant, tonnage, stages, seer2_rating, hspf_rating
      const topLevelCandidates: Array<[string, unknown]> = [
        ["equipment_type", input.equipment_type],
        ["tier", input.tier],
        ["market_segment", input.market_segment],
        ["type_descriptor", input.type_descriptor],
        ["refrigerant", input.refrigerant],
        ["tonnage", typeof input.tonnage === "number" ? input.tonnage : null],
        ["stages", input.stages],
        ["seer2_rating", input.seer2_rating],
        ["hspf_rating", input.hspf_rating],
      ];

      for (const [field, incomingVal] of topLevelCandidates) {
        if (incomingVal === undefined || incomingVal === null) continue;
        // market_segment defaults to 'residential' — only treat as a real
        // change when caller actually sent something different.
        if (field === "market_segment" && raw && (raw as Record<string, unknown>).market_segment === undefined) {
          continue;
        }
        const existingVal = (existing as Record<string, unknown>)[field];
        if (existingVal === null || existingVal === undefined) {
          updates[field] = incomingVal;
        } else if (existingVal === incomingVal) {
          // no-op
        } else {
          if (incomingConfidence > existingConfidence) {
            updates[field] = incomingVal;
            conflictsToLog.push({
              field,
              existing: existingVal,
              incoming: incomingVal,
              resolution: "overwrote",
            });
          } else {
            conflictsToLog.push({
              field,
              existing: existingVal,
              incoming: incomingVal,
              resolution: "kept_existing",
            });
          }
        }
      }

      // Specs JSONB: per-key merge with same confidence rule
      for (const [k, v] of Object.entries(cleanIncomingSpecs)) {
        const existingVal = mergedSpecs[k];
        if (existingVal === null || existingVal === undefined) {
          mergedSpecs[k] = v;
        } else if (existingVal === v) {
          // no-op
        } else if (incomingConfidence > existingConfidence) {
          mergedSpecs[k] = v;
          conflictsToLog.push({
            field: `specs.${k}`,
            existing: existingVal,
            incoming: v,
            resolution: "overwrote",
          });
        } else {
          conflictsToLog.push({
            field: `specs.${k}`,
            existing: existingVal,
            incoming: v,
            resolution: "kept_existing",
          });
        }
      }

      // Always remember the highest source confidence we've seen
      mergedSpecs._source_confidence = Math.max(existingConfidence, incomingConfidence);

      if (JSON.stringify(mergedSpecs) !== JSON.stringify(existingSpecs)) {
        updates.specs = mergedSpecs;
      }

      // Increment times_searched if requested
      if (input.increment_times_searched) {
        updates.times_searched = (existing.times_searched ?? 0) + 1;
      }

      // ----- Install tracking -----
      let didCreateInstall = false;
      if (input.job_id) {
        const { data: existingInstall } = await supabase
          .from("job_equipment_installs")
          .select("id")
          .eq("job_id", input.job_id)
          .eq("equipment_page_id", existing.id)
          .maybeSingle();

        if (!existingInstall) {
          const { error: instErr } = await supabase
            .from("job_equipment_installs")
            .insert({
              job_id: input.job_id,
              equipment_page_id: existing.id,
              source: input.source,
              source_confidence: incomingConfidence,
              install_date: input.install_date ?? null,
              serial_numbers: input.serial_numbers ?? null,
            });
          if (!instErr) {
            didCreateInstall = true;
            updates.install_count = (existing.install_count ?? 0) + 1;

            const installTs = input.install_date
              ? new Date(input.install_date).toISOString()
              : new Date().toISOString();
            if (
              !existing.last_installed_at ||
              new Date(installTs) > new Date(existing.last_installed_at)
            ) {
              updates.last_installed_at = installTs;
            }

            if (input.install_city) {
              const cities = Array.isArray(existing.cities_installed)
                ? (existing.cities_installed as string[])
                : [];
              if (!cities.includes(input.install_city)) {
                updates.cities_installed = [...cities, input.install_city];
              }
            }
          } else {
            console.warn("install insert failed:", instErr);
          }
        }
      }

      let wasUpdated = false;
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        const { error: updErr } = await supabase
          .from("equipment_pages")
          .update(updates)
          .eq("id", existing.id);
        if (updErr) {
          console.error("update failed:", updErr);
          return new Response(
            JSON.stringify({ error: "Update failed", details: updErr.message }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        wasUpdated = true;
      }

      // Log conflicts
      if (conflictsToLog.length > 0) {
        const conflictRows = conflictsToLog.map((c) => ({
          equipment_page_id: existing.id,
          field_name: c.field,
          existing_value: c.existing === null ? null : String(c.existing),
          incoming_value: c.incoming === null ? null : String(c.incoming),
          existing_confidence: existingConfidence,
          incoming_confidence: incomingConfidence,
          source: input.source,
          resolution: c.resolution,
        }));
        await supabase.from("equipment_page_conflicts").insert(conflictRows);
      }

      return new Response(
        JSON.stringify({
          equipment_page_id: existing.id,
          slug: existing.slug,
          was_created: false,
          was_updated: wasUpdated,
          install_count: (updates.install_count as number) ?? existing.install_count ?? 0,
          install_recorded: didCreateInstall,
          published: existing.published,
          merge_conflicts: conflictsToLog,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ====== INSERT PATH ======
    const newSpecs: Record<string, unknown> = {
      brand,
      model_number,
      ...cleanIncomingSpecs,
      _source_confidence: incomingConfidence,
    };

    const insertRow: Record<string, unknown> = {
      slug,
      brand,
      model_number,
      model_pattern: model_number.substring(0, 8),
      equipment_type: input.equipment_type ?? null,
      specs: newSpecs,
      tier: input.tier ?? null,
      market_segment: input.market_segment ?? "residential",
      type_descriptor: input.type_descriptor ?? null,
      stages: input.stages ?? null,
      tonnage: typeof input.tonnage === "number" ? input.tonnage : null,
      seer2_rating: input.seer2_rating ?? null,
      hspf_rating: input.hspf_rating ?? null,
      refrigerant: input.refrigerant ?? null,
      auto_generated: input.source !== "manual",
      published: true,
      published_at: new Date().toISOString(),
      times_searched: input.increment_times_searched ? 1 : 0,
      install_count: input.job_id ? 1 : 0,
      last_installed_at: input.job_id
        ? input.install_date
          ? new Date(input.install_date).toISOString()
          : new Date().toISOString()
        : null,
      cities_installed: input.job_id && input.install_city ? [input.install_city] : [],
      seo_title: `${brand} ${model_number} Specs & Docs | Truficient`,
      seo_description: `${brand} ${model_number} specs — tonnage, SEER, refrigerant & manuals. Free HVAC resource from Truficient.`,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("equipment_pages")
      .insert(insertRow)
      .select("id, slug, install_count, published")
      .single();

    if (insErr || !inserted) {
      console.error("insert failed:", insErr);
      return new Response(
        JSON.stringify({ error: "Insert failed", details: insErr?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Install pairing
    let installRecorded = false;
    if (input.job_id) {
      const { error: instErr } = await supabase
        .from("job_equipment_installs")
        .insert({
          job_id: input.job_id,
          equipment_page_id: inserted.id,
          source: input.source,
          source_confidence: incomingConfidence,
          install_date: input.install_date ?? null,
          serial_numbers: input.serial_numbers ?? null,
        });
      if (!instErr) installRecorded = true;
    }

    return new Response(
      JSON.stringify({
        equipment_page_id: inserted.id,
        slug: inserted.slug,
        was_created: true,
        was_updated: true,
        install_count: inserted.install_count ?? 0,
        install_recorded: installRecorded,
        published: inserted.published,
        merge_conflicts: [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("upsert-equipment-page fatal:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
