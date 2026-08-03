// seo-report-save — Extract structured metadata from a Bach SEO report and persist it
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_TYPES = new Set([
  "site_audit",
  "keyword_gap",
  "indexing",
  "performance",
  "cluster",
  "general",
]);

function stripFences(s: string): string {
  let out = s.trim();
  // Remove ```json ... ``` or ``` ... ``` wrappers
  out = out.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  return out.trim();
}

function safeStringArray(v: unknown, max = 20): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((x) => String(x).trim().slice(0, 200))
    .slice(0, max);
}

interface ParsedMeta {
  title: string;
  summary: string;
  report_type: string;
  tags: string[];
  related_page_paths: string[];
  related_clusters: string[];
  action_items: { action_text: string; page_path: string | null }[];
}

function fallbackMeta(prompt: string, response: string): ParsedMeta {
  return {
    title: (prompt || "SEO Report").slice(0, 80),
    summary: (response || "").slice(0, 200),
    report_type: "general",
    tags: [],
    related_page_paths: [],
    related_clusters: [],
    action_items: [],
  };
}

function parseMeta(raw: string, prompt: string, response: string): ParsedMeta {
  try {
    const cleaned = stripFences(raw);
    // Try to find a JSON object if the model added prose
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const slice = jsonStart >= 0 && jsonEnd > jsonStart ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
    const parsed = JSON.parse(slice);

    const reportType = typeof parsed.report_type === "string" && VALID_TYPES.has(parsed.report_type)
      ? parsed.report_type
      : "general";

    const actionItems: ParsedMeta["action_items"] = Array.isArray(parsed.action_items)
      ? parsed.action_items
          .filter((a: any) => a && typeof a.action_text === "string" && a.action_text.trim().length > 0)
          .slice(0, 50)
          .map((a: any) => ({
            action_text: String(a.action_text).trim().slice(0, 1000),
            page_path: typeof a.page_path === "string" && a.page_path.trim() ? String(a.page_path).trim().slice(0, 500) : null,
          }))
      : [];

    return {
      title: (typeof parsed.title === "string" ? parsed.title : prompt).slice(0, 80) || "SEO Report",
      summary: (typeof parsed.summary === "string" ? parsed.summary : response).slice(0, 600),
      report_type: reportType,
      tags: safeStringArray(parsed.tags, 10),
      related_page_paths: safeStringArray(parsed.related_page_paths, 30),
      related_clusters: safeStringArray(parsed.related_clusters, 15),
      action_items: actionItems,
    };
  } catch (_e) {
    return fallbackMeta(prompt, response);
  }
}

const META_SYSTEM = `You extract structured metadata from SEO analysis reports. Return STRICT JSON only — no markdown, no commentary, no code fences.`;

function buildMetaPrompt(fullResponse: string): string {
  return `Given the SEO report below, return STRICT JSON only — no markdown, no commentary. Schema:
{
  "title": "max 80 chars descriptive title",
  "summary": "1-2 sentence summary",
  "report_type": "site_audit|keyword_gap|indexing|performance|cluster|general",
  "tags": ["3-7 short tags"],
  "related_page_paths": ["paths mentioned"],
  "related_clusters": ["clusters mentioned"],
  "action_items": [{"action_text": "...", "page_path": "/optional"}]
}
Report:
---
${fullResponse}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const original_prompt: string = typeof body.original_prompt === "string" ? body.original_prompt : "";
    const full_response: string = typeof body.full_response === "string" ? body.full_response : "";
    const model_used: string = typeof body.model_used === "string" ? body.model_used : "unknown";
    const pages_analyzed: number | null = typeof body.pages_analyzed === "number" ? body.pages_analyzed : null;
    const pages_flagged: number | null = typeof body.pages_flagged === "number" ? body.pages_flagged : null;

    if (!original_prompt.trim() || !full_response.trim()) {
      return new Response(JSON.stringify({ error: "original_prompt and full_response are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to identify the calling user (optional — we still save without one)
    let created_by: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, "");
        const { data: userData } = await supabase.auth.getUser(token);
        created_by = userData?.user?.id ?? null;
      }
    } catch (_e) { /* ignore */ }

    // Extract metadata via Lovable AI gateway (uses fast model — this is a lightweight extraction task)
    let meta: ParsedMeta;
    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: META_SYSTEM },
            { role: "user", content: buildMetaPrompt(full_response) },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!aiRes.ok) {
        console.warn("Meta extraction AI call failed:", aiRes.status, await aiRes.text());
        meta = fallbackMeta(original_prompt, full_response);
      } else {
        const data = await aiRes.json();
        const raw: string = data?.choices?.[0]?.message?.content ?? "";
        meta = parseMeta(raw, original_prompt, full_response);
      }
    } catch (e) {
      console.warn("Meta extraction error:", e);
      meta = fallbackMeta(original_prompt, full_response);
    }

    // Insert the seo_reports row
    const { data: report, error: insertErr } = await supabase
      .from("seo_reports")
      .insert({
        title: meta.title,
        original_prompt,
        summary: meta.summary,
        full_response,
        report_type: meta.report_type,
        pages_analyzed,
        pages_flagged,
        model_used,
        tags: meta.tags,
        related_page_paths: meta.related_page_paths,
        related_clusters: meta.related_clusters,
        created_by,
      })
      .select("id")
      .single();

    if (insertErr || !report) {
      console.error("Failed to insert seo_reports row:", insertErr);
      return new Response(JSON.stringify({ error: insertErr?.message ?? "Failed to save report" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert action items
    if (meta.action_items.length > 0) {
      const rows = meta.action_items.map((a) => ({
        report_id: report.id,
        action_text: a.action_text,
        page_path: a.page_path,
        status: "open",
      }));
      const { error: actErr } = await supabase.from("seo_report_actions").insert(rows);
      if (actErr) console.warn("Failed to insert action items:", actErr);
    }

    return new Response(JSON.stringify({ report_id: report.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seo-report-save error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
