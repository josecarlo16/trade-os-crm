// Bach SEO Analyst — Lovable AI powered analysis over page_seo data
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MODELS = new Set([
  "google/gemini-2.5-pro",
  "openai/gpt-5",
  "openai/gpt-5-mini",
]);

const SYSTEM_PROMPT = `You are Bach, the in-house SEO analyst for Truficient HVAC.
You analyze the site's SEO health using structured data from the page_seo table.
You ONLY answer based on the data context provided in the user message.

Guidelines:
- Be concise, structured, and actionable. Use markdown.
- Prefer short bullet lists, grouped by theme (titles, descriptions, schema, indexing, internal links, clusters, performance).
- When you flag a page, include its page_path so the user can click to fix it.
- For internal-linking opportunities, suggest concrete from→to pairs based on shared cluster/keyword/page_type.
- For cluster/keyword gaps, look for under-built clusters or missing supporting content.
- For performance, prioritize pages with high impressions but poor CTR or position 5–20 (striking distance).
- If asked something you can't answer from the data, say so briefly.
- Never invent page paths, keywords, or metrics.

When the user's quick action is "internal_linking", AFTER your normal markdown analysis, append a fenced JSON code block tagged \`opportunities\` containing an array of suggested links. Schema:
\`\`\`opportunities
[
  {
    "source_url": "/page-that-should-add-the-link/",
    "target_url": "/page-being-linked-to/",
    "anchor_text": "short descriptive anchor",
    "cluster": "Oak Cliff",
    "reason": "1-sentence why",
    "priority": "high|medium|low"
  }
]
\`\`\`
Only include pairs where BOTH source_url and target_url appear in the DATA CONTEXT. Limit to 30 highest-value pairs.`;

interface PageSEORow {
  page_path: string;
  page_name: string;
  page_type: string | null;
  cluster: string | null;
  target_keyword: string | null;
  meta_title: string | null;
  meta_description: string | null;
  index_status: string | null;
  schema_applied: boolean | null;
  internal_links: number | null;
  gsc_impressions: number | null;
  gsc_clicks: number | null;
  avg_position: number | null;
  last_content_update: string | null;
  updated_at: string | null;
}

function summarizePages(pages: PageSEORow[]) {
  const total = pages.length;
  const byType: Record<string, number> = {};
  const byCluster: Record<string, number> = {};
  let missingTitle = 0, missingDesc = 0, longTitle = 0, shortTitle = 0, longDesc = 0, shortDesc = 0;
  let missingSchema = 0, indexed = 0, notIndexed = 0;
  let totalImpressions = 0, totalClicks = 0, posCount = 0, posSum = 0;

  for (const p of pages) {
    byType[p.page_type ?? "Unknown"] = (byType[p.page_type ?? "Unknown"] ?? 0) + 1;
    byCluster[p.cluster ?? "Unknown"] = (byCluster[p.cluster ?? "Unknown"] ?? 0) + 1;
    const t = p.meta_title?.trim() ?? "";
    const d = p.meta_description?.trim() ?? "";
    if (!t) missingTitle++;
    else if (t.length > 60) longTitle++;
    else if (t.length < 30) shortTitle++;
    if (!d) missingDesc++;
    else if (d.length > 160) longDesc++;
    else if (d.length < 80) shortDesc++;
    if (!p.schema_applied) missingSchema++;
    if ((p.index_status ?? "").toLowerCase() === "indexed") indexed++;
    else notIndexed++;
    totalImpressions += p.gsc_impressions ?? 0;
    totalClicks += p.gsc_clicks ?? 0;
    if (p.avg_position != null) { posSum += Number(p.avg_position); posCount++; }
  }

  return {
    total,
    byType,
    byCluster,
    titles: { missing: missingTitle, tooLong: longTitle, tooShort: shortTitle },
    descriptions: { missing: missingDesc, tooLong: longDesc, tooShort: shortDesc },
    schema: { missing: missingSchema },
    indexing: { indexed, notIndexed },
    performance: {
      totalImpressions,
      totalClicks,
      avgPosition: posCount ? +(posSum / posCount).toFixed(2) : null,
      ctr: totalImpressions ? +((totalClicks / totalImpressions) * 100).toFixed(2) : null,
    },
  };
}

function buildContextForAction(pages: PageSEORow[], action: string) {
  const summary = summarizePages(pages);

  const compact = (p: PageSEORow) => ({
    path: p.page_path,
    name: p.page_name,
    type: p.page_type,
    cluster: p.cluster,
    kw: p.target_keyword,
    title: p.meta_title,
    titleLen: p.meta_title?.length ?? 0,
    desc: p.meta_description,
    descLen: p.meta_description?.length ?? 0,
    indexed: p.index_status,
    schema: !!p.schema_applied,
    links: p.internal_links ?? 0,
    impr: p.gsc_impressions ?? 0,
    clicks: p.gsc_clicks ?? 0,
    pos: p.avg_position,
  });

  switch (action) {
    case "site_health": {
      const issues = pages.filter(p =>
        !p.meta_title || (p.meta_title?.length ?? 0) > 60 || (p.meta_title?.length ?? 0) < 30 ||
        !p.meta_description || (p.meta_description?.length ?? 0) > 160 || (p.meta_description?.length ?? 0) < 80 ||
        !p.schema_applied ||
        (p.index_status ?? "").toLowerCase() !== "indexed"
      ).slice(0, 80).map(compact);
      return { mode: "site_health", summary, issues };
    }
    case "internal_linking": {
      const byCluster: Record<string, ReturnType<typeof compact>[]> = {};
      for (const p of pages) {
        const k = p.cluster ?? "Unknown";
        (byCluster[k] ??= []).push(compact(p));
      }
      const lowLinkPages = pages
        .filter(p => (p.internal_links ?? 0) < 3)
        .slice(0, 60)
        .map(compact);
      return { mode: "internal_linking", summary, byCluster, lowLinkPages };
    }
    case "cluster_gaps": {
      const byCluster: Record<string, { count: number; types: Record<string, number>; samples: string[] }> = {};
      for (const p of pages) {
        const k = p.cluster ?? "Unknown";
        const entry = (byCluster[k] ??= { count: 0, types: {}, samples: [] });
        entry.count++;
        entry.types[p.page_type ?? "Unknown"] = (entry.types[p.page_type ?? "Unknown"] ?? 0) + 1;
        if (entry.samples.length < 6 && p.target_keyword) entry.samples.push(p.target_keyword);
      }
      return { mode: "cluster_gaps", summary, byCluster };
    }
    case "performance": {
      const striking = pages
        .filter(p => (p.avg_position ?? 99) >= 5 && (p.avg_position ?? 99) <= 20 && (p.gsc_impressions ?? 0) > 50)
        .sort((a, b) => (b.gsc_impressions ?? 0) - (a.gsc_impressions ?? 0))
        .slice(0, 40)
        .map(compact);
      const lowCtr = pages
        .filter(p => (p.gsc_impressions ?? 0) > 100 && (p.gsc_clicks ?? 0) / Math.max(1, p.gsc_impressions ?? 1) < 0.02)
        .slice(0, 30)
        .map(compact);
      const topClicks = [...pages]
        .sort((a, b) => (b.gsc_clicks ?? 0) - (a.gsc_clicks ?? 0))
        .slice(0, 15)
        .map(compact);
      return { mode: "performance", summary, strikingDistance: striking, lowCtr, topClicks };
    }
    default: {
      return {
        mode: "freeform",
        summary,
        pages: pages.slice(0, 200).map(compact),
      };
    }
  }
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
    const action: string = typeof body.action === "string" ? body.action : "freeform";
    const question: string = typeof body.question === "string" ? body.question : "";
    const requestedModel: string = typeof body.model === "string" ? body.model : "google/gemini-2.5-pro";
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : "google/gemini-2.5-pro";

    if (action === "freeform" && !question.trim()) {
      return new Response(JSON.stringify({ error: "Question is required for freeform analysis." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pages, error } = await supabase
      .from("page_seo")
      .select(
        "page_path, page_name, page_type, cluster, target_keyword, meta_title, meta_description, index_status, schema_applied, internal_links, gsc_impressions, gsc_clicks, avg_position, last_content_update, updated_at"
      )
      .limit(1000);

    if (error) throw new Error(`Failed to load page_seo: ${error.message}`);

    const context = buildContextForAction((pages ?? []) as PageSEORow[], action);

    const userPrompt =
      action === "freeform"
        ? `User question: ${question}\n\nDATA CONTEXT (JSON):\n${JSON.stringify(context)}`
        : `Quick action: ${action}\n${question ? `Additional note: ${question}\n` : ""}\nDATA CONTEXT (JSON):\n${JSON.stringify(context)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error", details: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const answer: string = data?.choices?.[0]?.message?.content ?? "(no response)";

    // Persist the analysis
    let analysisId: string | null = null;
    try {
      const { data: inserted } = await supabase
        .from("seo_bach_analyses")
        .insert({
          action,
          question: question || null,
          model,
          answer_markdown: answer,
          total_analyzed: context.summary.total,
        })
        .select("id")
        .single();
      analysisId = inserted?.id ?? null;
    } catch (persistErr) {
      console.warn("Failed to persist analysis:", persistErr);
    }

    // For internal_linking, parse the ```opportunities ... ``` block and persist rows
    let opportunitiesSaved = 0;
    if (action === "internal_linking" && analysisId) {
      try {
        const match = answer.match(/```opportunities\s*([\s\S]*?)```/i);
        if (match) {
          const arr = JSON.parse(match[1].trim());
          if (Array.isArray(arr)) {
            const validPaths = new Set((pages ?? []).map((p: any) => String(p.page_path)));
            const rows = arr
              .filter((o: any) => o && typeof o.source_url === "string" && typeof o.target_url === "string")
              .filter((o: any) => o.source_url !== o.target_url)
              .filter((o: any) => validPaths.has(o.source_url) && validPaths.has(o.target_url))
              .slice(0, 60)
              .map((o: any) => ({
                analysis_id: analysisId,
                source_url: o.source_url,
                target_url: o.target_url,
                anchor_text: typeof o.anchor_text === "string" ? o.anchor_text.slice(0, 200) : null,
                cluster: typeof o.cluster === "string" ? o.cluster.slice(0, 120) : null,
                reason: typeof o.reason === "string" ? o.reason.slice(0, 500) : null,
                priority: ["high", "medium", "low"].includes(o.priority) ? o.priority : "medium",
                status: "todo",
                apply_method: "db_content_append",
              }));
            if (rows.length) {
              const { error: upErr } = await supabase
                .from("seo_linking_opportunities")
                .upsert(rows, { onConflict: "source_url,target_url", ignoreDuplicates: true });
              if (!upErr) opportunitiesSaved = rows.length;
              else console.warn("Opportunity upsert error:", upErr);
            }
          }
        }
      } catch (parseErr) {
        console.warn("Failed to parse opportunities JSON:", parseErr);
      }
    }

    return new Response(
      JSON.stringify({
        answer,
        model,
        action,
        analysisId,
        opportunitiesSaved,
        meta: { totalAnalyzed: context.summary.total },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("seo-bach-analyst error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
