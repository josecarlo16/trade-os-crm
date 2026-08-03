import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ENTITIES = new Set([
  "invoices",
  "customers",
  "payments",
  "estimates",
  "estimate_line_items",
  "invoice_line_items",
  "expenses",
  "catalog",
  "business",
  "upload",
  "materials",
  "jobs",
]);

// The Otto Pay api-sync endpoint uses hyphens, our frontend uses underscores
const ENTITY_MAP: Record<string, string> = {
  estimate_line_items: "estimate-line-items",
  invoice_line_items: "invoice-line-items",
};

function resolveEntity(entity: string): string {
  return ENTITY_MAP[entity] || entity;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth: require valid Supabase JWT ---
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[ottopay-proxy] Missing or malformed auth header");
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) {
      console.error("[ottopay-proxy] Auth failed:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("[ottopay-proxy] Auth exception:", e);
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // --- Read secrets (server-side only) ---
  const OTTO_URL = Deno.env.get("OTTOPAY_SUPABASE_URL") || Deno.env.get("VITE_OTTOPAY_SUPABASE_URL");
  const SYNC_KEY = Deno.env.get("OTTOPAY_SYNC_KEY") || Deno.env.get("VITE_OTTOPAY_SYNC_KEY");
  const BUSINESS_ID = Deno.env.get("OTTOPAY_BUSINESS_ID") || Deno.env.get("VITE_OTTOPAY_BUSINESS_ID");

  if (!OTTO_URL || !SYNC_KEY || !BUSINESS_ID) {
    console.error("[ottopay-proxy] Missing Otto Pay secrets");
    return new Response(
      JSON.stringify({ success: false, error: "Otto Pay not configured on server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const API_URL = `${OTTO_URL}/functions/v1/api-sync`;

  // --- Parse body ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { entity, method = "GET", id, params } = body;

  if (!entity || !VALID_ENTITIES.has(entity)) {
    return new Response(
      JSON.stringify({ success: false, error: `Invalid entity type: ${entity}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const resolvedEntity = resolveEntity(entity);

  const ottoHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": SYNC_KEY,
    "x-business-id": BUSINESS_ID,
  };

  try {
    let ottoRes: Response;
    const upperMethod = method.toUpperCase();

    // Always put entity (and id) in query params for all methods
    const url = new URL(API_URL);
    url.searchParams.set("entity", resolvedEntity);

    if (upperMethod === "GET") {
      if (id) url.searchParams.set("id", id);
      if (params) {
        if (params.select) url.searchParams.set("select", params.select);
        if (params.order) url.searchParams.set("order", params.order);
        if (params.limit) url.searchParams.set("limit", String(params.limit));
        if (params.filters) {
          for (const [key, value] of Object.entries(params.filters)) {
            url.searchParams.set(`filter.${key}`, String(value));
          }
        }
      }
      ottoRes = await fetch(url.toString(), { headers: ottoHeaders });

    } else if (upperMethod === "DELETE") {
      if (id) url.searchParams.set("id", id);
      ottoRes = await fetch(url.toString(), { method: "DELETE", headers: ottoHeaders });

    } else {
      // POST, PATCH, PUT — entity in query params, data in body
      const resolvedId = (entity === "business" && id === "current") ? BUSINESS_ID : id;
      if (resolvedId) url.searchParams.set("id", resolvedId);

      ottoRes = await fetch(url.toString(), {
        method: upperMethod,
        headers: ottoHeaders,
        body: JSON.stringify(params || {}),
      });
    }

    if (!ottoRes.ok) {
      const errorText = await ottoRes.text();
      console.error(`[ottopay-proxy] Otto API ${ottoRes.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ data: null, error: { message: `Otto Pay error ${ottoRes.status}: ${errorText}` } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await ottoRes.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ottopay-proxy] Fetch error:", e);
    return new Response(
      JSON.stringify({ data: null, error: { message: "Otto Pay service unavailable" } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
