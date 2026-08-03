// Phase 2: Batch classifier for WorkEdge media using Gemini vision via Lovable AI Gateway.
// Reads unclassified workedge_project_media rows, classifies each photo, extracts data plate
// info, and routes data plates through upsert-equipment-page (dedupe enforced).
//
// Auth: accepts EITHER service-role bearer (cron) OR authenticated admin/manager/super_admin JWT.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentType =
  | "data_plate"
  | "install_shot"
  | "diagnostic"
  | "component"
  | "other";

type ReviewStatus =
  | "auto_approved"
  | "needs_review"
  | "approved"
  | "rejected"
  | "classification_failed";

interface ClassifyInput {
  batch_size?: number;
  force_reclassify?: boolean;
  media_ids?: string[];
  skip_upsert?: boolean;
}

interface DataPlateInfo {
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  tonnage: string | null;
  refrigerant: string | null;
  mfg_date: string | null;
  extraction_confidence: number;
}

interface GeminiResponse {
  content_type: ContentType;
  confidence: number;
  reasoning: string;
  data_plate_info: DataPlateInfo | null;
}

// ---------------------------------------------------------------------------
// Config defaults (overridden by integration_configs.equipment_classifier)
// ---------------------------------------------------------------------------

const DEFAULTS = {
  classification_auto_approve_threshold: 0.85,
  classification_needs_review_threshold: 0.6,
  data_plate_upsert_threshold: 0.75,
  batch_size_default: 25,
  batch_size_max: 100,
};

// ---------------------------------------------------------------------------
// Gemini prompt
// ---------------------------------------------------------------------------

const VISION_PROMPT = `You are analyzing a photo from an HVAC installation or service job site.

Classify the photo into exactly ONE of these categories:

- "data_plate": A close-up of a manufacturer's equipment label or nameplate showing model and serial numbers. Usually a metallic or paper sticker attached to the unit. Often has "MODEL", "SERIAL", "MFG DATE" text visible.

- "install_shot": A "beauty shot" of completed installation work. Shows finished equipment in context — outdoor condenser unit on pad, indoor air handler mounted, wall-mount ductless head installed, thermostat installed, ductwork, line sets. Professional-looking finished installation.

- "diagnostic": Technical measurement or inspection photo. Includes thermal imaging camera screens (rainbow/false-color images), multimeter readings with digital displays, pressure gauge manifolds, refrigerant scales.

- "component": Close-up of a specific part or component in isolation — capacitor, contactor, coil, filter, control board, fan blade. Usually taken during service or repair to document a specific part.

- "other": Anything that doesn't fit above — before-shots of old dirty equipment, damage documentation, paperwork/invoices, stock photos, people, tools, vehicles.

IF content_type is "data_plate", also extract:
- brand: Normalize to one of: "Goodman", "Trane", "Carrier", "Lennox", "Mitsubishi Electric", "Daikin", "Rheem", "Ruud", "York", "American Standard", "Amana", "Bryant", "Heil", "Tempstar", "Payne", "Fujitsu", "LG", "Samsung", "Bosch". If visible but not in this list, use the exact text.
- model_number: Exactly as shown on the plate. Preserve case and dashes.
- serial_number: Typically labeled "SERIAL", "SER", or "S/N".
- tonnage: Infer from model number if possible (e.g. Goodman "048"=4 tons, "060"=5 tons, "036"=3 tons). If unsure, return null rather than guess.
- refrigerant: Look for "R-410A", "R-32", "R-454B", "R-22".
- mfg_date: Format YYYY-MM-DD if possible. If only month/year, use YYYY-MM-01.

Return ONLY valid JSON, no markdown, no commentary:

{
  "content_type": "data_plate" | "install_shot" | "diagnostic" | "component" | "other",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence explaining the classification",
  "data_plate_info": {
    "brand": "...",
    "model_number": "...",
    "serial_number": "...",
    "tonnage": "3 Ton" | null,
    "refrigerant": "R-410A" | null,
    "mfg_date": "2023-05-01" | null,
    "extraction_confidence": 0.0-1.0
  } | null
}

If content_type is NOT "data_plate", set data_plate_info to null.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function parseGeminiJSON(text: string): GeminiResponse | null {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed.content_type === "string" &&
      typeof parsed.confidence === "number"
    ) {
      return parsed as GeminiResponse;
    }
    return null;
  } catch {
    return null;
  }
}

function tonnageStringToNumber(t: string | null): number | null {
  if (!t) return null;
  const m = t.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function reviewStatusFor(
  conf: number,
  cfg: typeof DEFAULTS,
): ReviewStatus {
  if (conf >= cfg.classification_auto_approve_threshold) return "auto_approved";
  return "needs_review";
}

async function callGeminiVision(
  imageUrl: string,
  apiKey: string,
): Promise<GeminiResponse | null> {
  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VISION_PROMPT },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  };

  let lastErr: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (resp.status === 429) {
        lastErr = "rate_limited";
        await sleep(5000);
        continue;
      }
      if (resp.status === 402) {
        return null; // credits exhausted; bubble up via null
      }
      if (!resp.ok) {
        lastErr = `http_${resp.status}`;
        await sleep(attempt === 0 ? 1000 : 3000);
        continue;
      }

      const data = await resp.json();
      const text: string = data?.choices?.[0]?.message?.content ?? "";
      const parsed = parseGeminiJSON(text);
      if (parsed) return parsed;
      lastErr = "parse_failed";
      await sleep(1000);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "unknown";
      await sleep(1000);
    }
  }
  console.warn("Gemini call failed after retries:", lastErr);
  return null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ------- Auth: service-role bearer OR admin/manager JWT -------
  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceRole = authHeader === `Bearer ${SERVICE_KEY}`;

  if (!isServiceRole) {
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error } = await userClient.auth.getClaims(token);
      if (error || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", claimsData.claims.sub);
      const allowed = roles?.some((r: { role: string }) =>
        ["admin", "manager", "super_admin"].includes(r.role),
      );
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("auth error:", e);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // ------- Parse input -------
  const raw = await req.json().catch(() => ({}));
  const input: ClassifyInput = raw ?? {};

  // ------- Load thresholds -------
  const { data: cfgRow } = await supabase
    .from("integration_configs")
    .select("config")
    .eq("integration_name", "equipment_classifier")
    .maybeSingle();
  const cfg = { ...DEFAULTS, ...((cfgRow?.config as Record<string, number>) ?? {}) };

  const requestedSize = input.batch_size ?? cfg.batch_size_default;
  const batchSize = Math.min(
    Math.max(1, requestedSize),
    cfg.batch_size_max,
  );

  // ------- Fetch batch -------
  let mediaQuery = supabase
    .from("workedge_project_media")
    .select(`
      id, media_url, media_type, job_id, content_type, review_status,
      crm_jobs:job_id (
        id,
        crm_locations:location_id ( city, zip_code )
      )
    `)
    .eq("media_type", "photo")
    .not("media_url", "is", null);

  if (input.media_ids && input.media_ids.length > 0) {
    mediaQuery = mediaQuery.in("id", input.media_ids);
  } else if (input.force_reclassify) {
    mediaQuery = mediaQuery.neq("review_status", "approved").limit(batchSize);
  } else {
    mediaQuery = mediaQuery.is("content_type", null).limit(batchSize);
  }

  mediaQuery = mediaQuery.order("synced_at", { ascending: true });

  const { data: items, error: fetchErr } = await mediaQuery;
  if (fetchErr) {
    console.error("fetch error:", fetchErr);
    return new Response(
      JSON.stringify({ error: "Failed to fetch media", details: fetchErr.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const out = {
    processed: 0,
    classified: {
      data_plate: 0,
      install_shot: 0,
      diagnostic: 0,
      component: 0,
      other: 0,
      failed: 0,
    },
    equipment_extracted: 0,
    new_models_created: 0,
    existing_models_updated: 0,
    needs_review: 0,
    errors: [] as Array<{ media_id: string; error: string }>,
    duration_ms: 0,
  };

  if (!items || items.length === 0) {
    out.duration_ms = Date.now() - startedAt;
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Classifying ${items.length} media items (batch_size=${batchSize})`);

  // ------- Process sequentially with 250ms gap -------
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    out.processed++;

    if (i > 0 && i % 5 === 0) {
      console.log(`Progress: ${i}/${items.length}`);
    }

    if (!item.media_url || item.media_url.startsWith("note://")) {
      out.classified.failed++;
      out.errors.push({ media_id: item.id, error: "Invalid media_url" });
      continue;
    }

    const result = await callGeminiVision(item.media_url, LOVABLE_API_KEY);

    if (!result) {
      out.classified.failed++;
      out.errors.push({ media_id: item.id, error: "Gemini call failed" });
      await supabase
        .from("workedge_project_media")
        .update({
          content_type: "other",
          classification_confidence: 0,
          classified_at: new Date().toISOString(),
          review_status: "classification_failed",
        })
        .eq("id", item.id);
      await sleep(250);
      continue;
    }

    const ct: ContentType = result.content_type;
    const conf = Math.max(0, Math.min(1, result.confidence ?? 0));
    out.classified[ct] = (out.classified[ct] ?? 0) + 1;

    const update: Record<string, unknown> = {
      content_type: ct,
      classification_confidence: conf,
      classification_metadata: result,
      classified_at: new Date().toISOString(),
      review_status: reviewStatusFor(conf, cfg),
    };

    let extracted = false;
    let didUpsert = false;
    let upsertWasCreated = false;

    if (ct === "data_plate" && result.data_plate_info) {
      const dp = result.data_plate_info;
      const extConf = Math.max(0, Math.min(1, dp.extraction_confidence ?? 0));
      update.extracted_brand = dp.brand;
      update.extracted_model = dp.model_number;
      update.extracted_serial = dp.serial_number;
      update.extracted_tonnage = tonnageStringToNumber(dp.tonnage);
      update.extracted_refrigerant = dp.refrigerant;
      update.extracted_mfg_date = dp.mfg_date;
      update.extraction_confidence = extConf;
      extracted = true;

      // Force needs_review if extraction confidence too low
      if (extConf < cfg.classification_needs_review_threshold) {
        update.review_status = "needs_review";
      }

      if (
        !input.skip_upsert &&
        dp.brand &&
        dp.model_number &&
        extConf >= cfg.data_plate_upsert_threshold
      ) {
        try {
          const job = (item.crm_jobs as unknown as {
            crm_locations: { city: string | null; zip_code: string | null } | null;
          } | null) ?? null;
          const loc = job?.crm_locations ?? null;
          const upsertBody: Record<string, unknown> = {
            brand: dp.brand,
            model_number: dp.model_number,
            source: "workedge_extraction",
            source_confidence: extConf,
            tonnage: tonnageStringToNumber(dp.tonnage) ?? undefined,
            refrigerant: dp.refrigerant ?? undefined,
            manufactured_year: dp.mfg_date
              ? parseInt(dp.mfg_date.slice(0, 4), 10)
              : undefined,
            install_city: loc?.city ?? undefined,
            install_zip: loc?.zip_code ?? undefined,
            job_id: item.job_id ?? undefined,
            serial_numbers: dp.serial_number ? [dp.serial_number] : undefined,
          };
          // Strip undefineds
          Object.keys(upsertBody).forEach((k) => {
            if (upsertBody[k] === undefined) delete upsertBody[k];
          });

          const upsertResp = await fetch(
            `${SUPABASE_URL}/functions/v1/upsert-equipment-page`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${SERVICE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(upsertBody),
            },
          );
          if (upsertResp.ok) {
            const upsertData = await upsertResp.json();
            if (upsertData?.equipment_page_id) {
              update.equipment_page_id = upsertData.equipment_page_id;
              didUpsert = true;
              upsertWasCreated = !!upsertData.was_created;
            }
          } else {
            const txt = await upsertResp.text();
            console.warn(
              `upsert-equipment-page failed for media ${item.id}: ${upsertResp.status} ${txt}`,
            );
          }
        } catch (e) {
          console.warn(`upsert call error for ${item.id}:`, e);
        }
      }
    }

    const { error: updErr } = await supabase
      .from("workedge_project_media")
      .update(update)
      .eq("id", item.id);

    if (updErr) {
      out.errors.push({ media_id: item.id, error: updErr.message });
    } else {
      if (extracted) out.equipment_extracted++;
      if (didUpsert) {
        if (upsertWasCreated) out.new_models_created++;
        else out.existing_models_updated++;
      }
      if (update.review_status === "needs_review") out.needs_review++;
    }

    await sleep(250);
  }

  out.duration_ms = Date.now() - startedAt;
  console.log("Classifier complete:", JSON.stringify(out));
  return new Response(JSON.stringify(out), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
