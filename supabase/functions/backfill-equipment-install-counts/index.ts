// One-shot backfill of equipment_pages.install_count, cities_installed, and
// last_installed_at from historical equipment_scans. Best-effort only —
// scans are scanner activity, not confirmed installs, but they're the most
// reliable proxy until job_equipment_installs gets populated going forward.
//
// Triggered by an admin from /admin/equipment-library.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Page {
  id: string;
  brand: string;
  model_number: string;
}

interface Scan {
  id: string;
  zip_code: string | null;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin/super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const userId = claimsData.claims.sub as string;
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isPrivileged = !!roles?.some((r: { role: string }) =>
      ["admin", "super_admin"].includes(r.role),
    );
    if (!isPrivileged) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a zip→city lookup from crm_locations (best-effort)
    const { data: locs } = await admin
      .from("crm_locations")
      .select("zip_code, city")
      .not("zip_code", "is", null)
      .not("city", "is", null);
    const zipToCity = new Map<string, string>();
    for (const l of (locs ?? []) as Array<{ zip_code: string; city: string }>) {
      const z = l.zip_code?.toString().slice(0, 5);
      if (z && !zipToCity.has(z)) zipToCity.set(z, l.city);
    }

    // Pull all equipment pages
    const { data: pages, error: pagesErr } = await admin
      .from("equipment_pages")
      .select("id, brand, model_number");
    if (pagesErr) {
      return new Response(
        JSON.stringify({ error: "Pages fetch failed", details: pagesErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let pagesUpdated = 0;
    let scansProcessed = 0;
    const errors: Array<{ page_id: string; error: string }> = [];

    for (const p of (pages ?? []) as Page[]) {
      const { data: scans, error: scanErr } = await admin
        .from("equipment_scans")
        .select("id, zip_code, created_at")
        .ilike("brand", p.brand)
        .ilike("model_number", p.model_number);

      if (scanErr) {
        errors.push({ page_id: p.id, error: scanErr.message });
        continue;
      }

      const scanRows = (scans ?? []) as Scan[];
      if (scanRows.length === 0) continue;

      scansProcessed += scanRows.length;

      const cities = new Set<string>();
      let latest: string | null = null;
      for (const s of scanRows) {
        const z = s.zip_code?.toString().slice(0, 5);
        if (z) {
          const city = zipToCity.get(z);
          if (city) cities.add(city);
        }
        if (!latest || new Date(s.created_at) > new Date(latest)) latest = s.created_at;
      }

      const { error: updErr } = await admin
        .from("equipment_pages")
        .update({
          install_count: scanRows.length,
          last_installed_at: latest,
          cities_installed: Array.from(cities),
        })
        .eq("id", p.id);

      if (updErr) {
        errors.push({ page_id: p.id, error: updErr.message });
      } else {
        pagesUpdated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pages_updated: pagesUpdated,
        scans_processed: scansProcessed,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("backfill fatal:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
