import { createClient } from "npm:@supabase/supabase-js@2";

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

  // --- Auth: require valid Supabase JWT, then resolve the caller's tenant ---
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[ottopay-proxy] Missing or malformed auth header");
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  let tenantId: string;
  try {
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

    // Resolve tenant with the service role client — RLS on user_roles is
    // fine for the user's own client too, but service role avoids any doubt.
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleRow, error: roleError } = await admin
      .from("user_roles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .not("tenant_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (roleError || !roleRow?.tenant_id) {
      console.error("[ottopay-proxy] No tenant for user:", user.id);
      return new Response(
        JSON.stringify({ success: false, error: "User has no tenant assigned" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    tenantId = roleRow.tenant_id;
  } catch (e) {
    console.error("[ottopay-proxy] Auth exception:", e);
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // --- Read this tenant's own Otto Pay connection (never a shared/global one —
  // each tenant has their own Otto Pay business, config lives in
  // integration_configs so no two tenants can ever be routed to the same
  // Otto Pay business account). ---
  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: config, error: configError } = await admin
    .from("integration_configs")
    .select("config, is_active")
    .eq("tenant_id", tenantId)
    .eq("integration_name", "ottopay")
    .single();

  if (configError || !config) {
    return new Response(
      JSON.stringify({ success: false, error: "Otto Pay not configured for this account" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!config.is_active) {
    return new Response(
      JSON.stringify({ success: false, error: "Otto Pay integration is disabled" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Truficient's connection currently lives in env secrets from before
  // multi-tenancy existed. Only THAT specific tenant may fall back to them —
  // any other tenant without its own config.config values must configure
  // their own Otto Pay business, never silently inherit Truficient's.
  const TRUFICIENT_TENANT_ID = "cb75a3f3-f310-4587-a4cc-098f50aef59c";
  const isLegacyTenant = tenantId === TRUFICIENT_TENANT_ID;

  const OTTO_URL = config.config?.supabase_url ||
    (isLegacyTenant ? (Deno.env.get("OTTOPAY_SUPABASE_URL") || Deno.env.get("VITE_OTTOPAY_SUPABASE_URL")) : undefined);
  const SYNC_KEY = config.config?.sync_key ||
    (isLegacyTenant ? (Deno.env.get("OTTOPAY_SYNC_KEY") || Deno.env.get("VITE_OTTOPAY_SYNC_KEY")) : undefined);
  const BUSINESS_ID = config.config?.business_id ||
    (isLegacyTenant ? (Deno.env.get("OTTOPAY_BUSINESS_ID") || Deno.env.get("VITE_OTTOPAY_BUSINESS_ID")) : undefined);

  if (!OTTO_URL || !SYNC_KEY || !BUSINESS_ID) {
    console.error("[ottopay-proxy] Incomplete Otto Pay config for tenant", tenantId);
    return new Response(
      JSON.stringify({ success: false, error: "Otto Pay not fully configured for this account" }),
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
