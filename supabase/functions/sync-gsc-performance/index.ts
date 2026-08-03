// Daily Google Search Console performance sync.
// Fetches site-wide daily totals, per-page 28-day totals, and top queries
// from the GSC searchanalytics API and upserts into gsc_*_metrics tables.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Service-account JWT → OAuth2 access token ----------
function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  let cleaned = pem.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/\\n/g, "\n").replace(/\\r/g, "");
  cleaned = cleaned
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const toSign = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const key = await importPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
  const jwt = `${toSign}.${base64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google token exchange failed [${res.status}]: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function querySearchAnalytics(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
): Promise<any[]> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`GSC searchAnalytics failed [${res.status}]: ${JSON.stringify(json)}`);
  return json.rows || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const clientEmail = Deno.env.get("GSC_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GSC_PRIVATE_KEY");
    const siteUrl = Deno.env.get("GSC_SITE_URL");
    if (!clientEmail || !privateKey || !siteUrl) {
      throw new Error("Missing GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, or GSC_SITE_URL");
    }

    const accessToken = await getAccessToken(clientEmail, privateKey);

    // GSC has a ~3-day data lag. Use a 90-day window ending 3 days ago for daily series,
    // and 28-day window for page/query rollups.
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 3);
    const start90 = new Date(endDate);
    start90.setDate(start90.getDate() - 89);
    const start28 = new Date(endDate);
    start28.setDate(start28.getDate() - 27);

    // 1. Site-wide daily totals (90 days)
    const dailyRows = await querySearchAnalytics(accessToken, siteUrl, {
      startDate: fmtDate(start90),
      endDate: fmtDate(endDate),
      dimensions: ["date"],
      rowLimit: 100,
    });

    let siteUpserted = 0;
    if (dailyRows.length > 0) {
      const dailyData = dailyRows.map((r: any) => ({
        date: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      }));
      const { error } = await supabase
        .from("gsc_site_metrics")
        .upsert(dailyData, { onConflict: "date" });
      if (error) throw new Error(`site upsert: ${error.message}`);
      siteUpserted = dailyData.length;
    }

    // 2. Per-page 28-day totals
    const pageRows = await querySearchAnalytics(accessToken, siteUrl, {
      startDate: fmtDate(start28),
      endDate: fmtDate(endDate),
      dimensions: ["page"],
      rowLimit: 1000,
    });

    let pagesUpserted = 0;
    if (pageRows.length > 0) {
      const nowIso = new Date().toISOString();
      // Aggregate by normalized path (collapses trailing-slash duplicates)
      const pageMap = new Map<string, { clicks: number; impressions: number; position_weighted: number }>();
      for (const r of pageRows as any[]) {
        let path = r.keys[0] as string;
        try {
          const u = new URL(path);
          path = u.pathname + u.search;
        } catch { /* keep as-is */ }
        // Normalize trailing slash (except root)
        if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
        const clicks = r.clicks || 0;
        const impressions = r.impressions || 0;
        const position = r.position || 0;
        const existing = pageMap.get(path);
        if (existing) {
          existing.clicks += clicks;
          existing.impressions += impressions;
          existing.position_weighted += position * impressions;
        } else {
          pageMap.set(path, { clicks, impressions, position_weighted: position * impressions });
        }
      }
      const pageData = Array.from(pageMap.entries()).map(([page_path, m]) => ({
        page_path,
        date_range: "28d",
        clicks: m.clicks,
        impressions: m.impressions,
        ctr: m.impressions > 0 ? m.clicks / m.impressions : 0,
        position: m.impressions > 0 ? m.position_weighted / m.impressions : 0,
        last_synced_at: nowIso,
      }));
      const { error } = await supabase
        .from("gsc_page_metrics")
        .upsert(pageData, { onConflict: "page_path,date_range" });
      if (error) throw new Error(`page upsert: ${error.message}`);
      pagesUpserted = pageData.length;
    }

    // 3. Top queries 28-day
    const queryRows = await querySearchAnalytics(accessToken, siteUrl, {
      startDate: fmtDate(start28),
      endDate: fmtDate(endDate),
      dimensions: ["query"],
      rowLimit: 500,
    });

    let queriesUpserted = 0;
    if (queryRows.length > 0) {
      // Clear old 28d queries first (queries change too much to leave stale rows)
      await supabase.from("gsc_query_metrics").delete().eq("date_range", "28d");

      const nowIso = new Date().toISOString();
      const queryMap = new Map<string, { clicks: number; impressions: number; position_weighted: number }>();
      for (const r of queryRows as any[]) {
        const key = String(r.keys[0] ?? "").trim().toLowerCase();
        if (!key) continue;
        const clicks = r.clicks || 0;
        const impressions = r.impressions || 0;
        const position = r.position || 0;
        const existing = queryMap.get(key);
        if (existing) {
          existing.clicks += clicks;
          existing.impressions += impressions;
          existing.position_weighted += position * impressions;
        } else {
          queryMap.set(key, { clicks, impressions, position_weighted: position * impressions });
        }
      }
      const queryData = Array.from(queryMap.entries()).map(([query, m]) => ({
        query,
        date_range: "28d",
        clicks: m.clicks,
        impressions: m.impressions,
        ctr: m.impressions > 0 ? m.clicks / m.impressions : 0,
        position: m.impressions > 0 ? m.position_weighted / m.impressions : 0,
        last_synced_at: nowIso,
      }));
      const { error } = await supabase
        .from("gsc_query_metrics")
        .upsert(queryData, { onConflict: "query,date_range" });
      if (error) throw new Error(`query upsert: ${error.message}`);
      queriesUpserted = queryData.length;
    }

    // 4. Page + query pairs (28d)
    const pageQueryRows = await querySearchAnalytics(accessToken, siteUrl, {
      startDate: fmtDate(start28),
      endDate: fmtDate(endDate),
      dimensions: ["page", "query"],
      rowLimit: 5000,
    });

    let pageQueriesUpserted = 0;
    if (pageQueryRows.length > 0) {
      await supabase.from("gsc_page_query_metrics").delete().eq("date_range", "28d");

      const nowIso = new Date().toISOString();
      const pqMap = new Map<string, { page: string; query: string; clicks: number; impressions: number; position_weighted: number }>();
      for (const r of pageQueryRows as any[]) {
        let page = String(r.keys?.[0] ?? "");
        try {
          const u = new URL(page);
          page = u.pathname + u.search;
        } catch { /* keep as-is */ }
        if (page.length > 1 && page.endsWith("/")) page = page.replace(/\/+$/, "");
        const query = String(r.keys?.[1] ?? "").trim().toLowerCase();
        if (!page || !query) continue;
        const clicks = r.clicks || 0;
        const impressions = r.impressions || 0;
        const position = r.position || 0;
        const key = `${page}\u0000${query}`;
        const existing = pqMap.get(key);
        if (existing) {
          existing.clicks += clicks;
          existing.impressions += impressions;
          existing.position_weighted += position * impressions;
        } else {
          pqMap.set(key, { page, query, clicks, impressions, position_weighted: position * impressions });
        }
      }
      const pqData = Array.from(pqMap.values()).map((m) => ({
        page: m.page,
        query: m.query,
        date_range: "28d",
        clicks: m.clicks,
        impressions: m.impressions,
        ctr: m.impressions > 0 ? m.clicks / m.impressions : 0,
        position: m.impressions > 0 ? m.position_weighted / m.impressions : 0,
        last_synced_at: nowIso,
      }));
      // Chunk upserts to stay within payload limits
      for (let i = 0; i < pqData.length; i += 1000) {
        const chunk = pqData.slice(i, i + 1000);
        const { error } = await supabase
          .from("gsc_page_query_metrics")
          .upsert(chunk, { onConflict: "page,query,date_range" });
        if (error) throw new Error(`page-query upsert: ${error.message}`);
        pageQueriesUpserted += chunk.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced_at: new Date().toISOString(),
        date_range: { start: fmtDate(start28), end: fmtDate(endDate) },
        site_days: siteUpserted,
        pages: pagesUpserted,
        queries: queriesUpserted,
        page_queries: pageQueriesUpserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    console.error("sync-gsc-performance error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
