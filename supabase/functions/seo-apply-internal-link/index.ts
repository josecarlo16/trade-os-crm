// Apply (or preview) a single internal link to a seo_location_pages.content body
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildLinkBlockHtml(
  items: { href: string; anchor: string }[],
  heading = "Related Resources"
): string {
  const lis = items.map(i => `<li><a href="${escapeHtml(i.href)}">${escapeHtml(i.anchor)}</a></li>`).join("");
  return `\n<!-- bach:internal-links -->\n<section class="bach-internal-links">\n  <h3>${escapeHtml(heading)}</h3>\n  <ul>${lis}</ul>\n</section>\n<!-- /bach:internal-links -->\n`;
}

function injectOrUpdateLinkBlock(currentContent: string, items: { href: string; anchor: string }[]) {
  const startTag = "<!-- bach:internal-links -->";
  const endTag = "<!-- /bach:internal-links -->";
  const start = currentContent.indexOf(startTag);
  const end = currentContent.indexOf(endTag);

  if (start !== -1 && end !== -1 && end > start) {
    const before = currentContent.slice(0, start);
    const after = currentContent.slice(end + endTag.length);
    const existing = currentContent.slice(start + startTag.length, end);
    const hrefRegex = /href="([^"]+)"/g;
    const existingHrefs = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = hrefRegex.exec(existing)) !== null) existingHrefs.add(m[1]);

    // Merge: keep existing items via re-parse of their <li>s
    const liRegex = /<li><a href="([^"]+)">([^<]+)<\/a><\/li>/g;
    const merged: { href: string; anchor: string }[] = [];
    while ((m = liRegex.exec(existing)) !== null) merged.push({ href: m[1], anchor: m[2] });
    for (const it of items) if (!existingHrefs.has(it.href)) merged.push(it);

    return before + buildLinkBlockHtml(merged) + after;
  }

  // Append new block at the end
  return currentContent.trimEnd() + "\n\n" + buildLinkBlockHtml(items);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const opportunityId: string | undefined = body.opportunityId;
    const dryRun: boolean = !!body.dryRun;

    if (!opportunityId) {
      return new Response(JSON.stringify({ error: "opportunityId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: opp, error: oppErr } = await supabase
      .from("seo_linking_opportunities")
      .select("*")
      .eq("id", opportunityId)
      .single();
    if (oppErr || !opp) throw new Error(oppErr?.message ?? "Opportunity not found");

    // Lookup source page in seo_location_pages
    const { data: sourcePage, error: sErr } = await supabase
      .from("seo_location_pages")
      .select("id, url_slug, content, h1_title, neighborhood")
      .eq("url_slug", opp.source_url)
      .maybeSingle();

    if (sErr) throw new Error(`Source lookup failed: ${sErr.message}`);
    if (!sourcePage) {
      const errMsg = `Source page ${opp.source_url} is not in seo_location_pages (likely a static React page). Manual edit required.`;
      if (!dryRun) {
        await supabase.from("seo_linking_opportunities").update({
          status: "failed",
          apply_error: errMsg,
          apply_method: "manual_static",
        }).eq("id", opportunityId);
      }
      return new Response(JSON.stringify({ error: errMsg, requiresManual: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lookup target for anchor text fallback
    let anchor = opp.anchor_text?.trim();
    if (!anchor) {
      const { data: targetPage } = await supabase
        .from("seo_location_pages")
        .select("h1_title, neighborhood, primary_service")
        .eq("url_slug", opp.target_url)
        .maybeSingle();
      anchor = targetPage?.h1_title
        ?? [targetPage?.primary_service, targetPage?.neighborhood].filter(Boolean).join(" – ")
        ?? opp.target_url;
    }

    const currentContent: string = sourcePage.content ?? "";

    // Skip if exact href already present anywhere in content
    const hrefPattern = new RegExp(`href=["']${opp.target_url.replace(/[/.\-]/g, "\\$&")}["']`);
    if (hrefPattern.test(currentContent)) {
      if (!dryRun) {
        await supabase.from("seo_linking_opportunities").update({
          status: "applied",
          apply_method: "db_content_append",
          applied_at: new Date().toISOString(),
          notes: "Link already present in content; marked applied.",
        }).eq("id", opportunityId);
      }
      return new Response(JSON.stringify({ alreadyPresent: true, sourceSlug: opp.source_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newContent = injectOrUpdateLinkBlock(currentContent, [{ href: opp.target_url, anchor: anchor! }]);

    if (dryRun) {
      return new Response(JSON.stringify({
        dryRun: true,
        sourceSlug: opp.source_url,
        anchor,
        diff: {
          before: currentContent.slice(-300),
          after: newContent.slice(-600),
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: upErr } = await supabase
      .from("seo_location_pages")
      .update({ content: newContent })
      .eq("id", sourcePage.id);
    if (upErr) {
      await supabase.from("seo_linking_opportunities").update({
        status: "failed", apply_error: upErr.message, apply_method: "db_content_append",
      }).eq("id", opportunityId);
      throw new Error(`Failed to update source page: ${upErr.message}`);
    }

    await supabase.from("seo_linking_opportunities").update({
      status: "applied",
      apply_method: "db_content_append",
      applied_at: new Date().toISOString(),
      apply_error: null,
    }).eq("id", opportunityId);

    return new Response(JSON.stringify({
      success: true, sourceSlug: opp.source_url, target: opp.target_url, anchor,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("seo-apply-internal-link error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
