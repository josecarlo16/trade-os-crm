// Daily GA4 Data API sync.
//
// Reuses the same Google service account as sync-gsc-index-status
// (GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY). To make this work you must also:
//   1. Enable the "Google Analytics Data API" in the same Google Cloud
//      project that owns the service account.
//   2. Add the service account email as a Viewer on the GA4 property
//      (Admin → Property Access Management).
//
// Required additional secret:
//   GA4_PROPERTY_ID  — numeric GA4 property ID (e.g. "123456789").
//
// Writes:
//   - public.ga4_page_metrics      (per-page metrics × 7d/30d/90d)
//   - public.ga4_traffic_sources   (top sessionSource × 7d/30d/90d)
//
// Cron: daily at 2:00am CST (one hour after the GSC sync at 1:00am).

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
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
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
    scope: "https://www.googleapis.com/auth/analytics.readonly",
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

// ---------- GA4 Data API call ----------
const RANGES: Array<{ key: "7d" | "30d" | "90d"; days: number }> = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
];

async function runReport(
  propertyId: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<any> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`GA4 runReport failed [${res.status}]: ${JSON.stringify(json)}`);
  return json;
}

function getMetricValue(row: any, idx: number): number {
  const v = row?.metricValues?.[idx]?.value;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientEmail = Deno.env.get("GSC_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GSC_PRIVATE_KEY");
    const propertyId = Deno.env.get("GA4_PROPERTY_ID");
    if (!clientEmail) throw new Error("GSC_CLIENT_EMAIL is not configured");
    if (!privateKey) throw new Error("GSC_PRIVATE_KEY is not configured");
    if (!propertyId) throw new Error("GA4_PROPERTY_ID is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const accessToken = await getAccessToken(clientEmail, privateKey);

    const summary: Record<string, { pages: number; sources: number }> = {};

    for (const { key, days } of RANGES) {
      // ----- per-page metrics -----
      const pageReport = await runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "userEngagementDuration" },
          { name: "conversions" },
          { name: "bounceRate" },
        ],
        limit: 5000,
      });

      const pageRows = (pageReport.rows ?? []) as any[];
      let pageCount = 0;
      for (const row of pageRows) {
        const pagePath = row?.dimensionValues?.[0]?.value as string | undefined;
        if (!pagePath) continue;
        const sessions = getMetricValue(row, 0);
        const users = getMetricValue(row, 1);
        const engagement = getMetricValue(row, 2);
        const conversions = getMetricValue(row, 3);
        const bounceRate = getMetricValue(row, 4);
        const avgEngagement = users > 0 ? engagement / users : 0;

        const { error } = await supabase
          .from("ga4_page_metrics")
          .upsert(
            {
              page_path: pagePath,
              date_range: key,
              sessions: Math.round(sessions),
              users: Math.round(users),
              avg_engagement_seconds: Number(avgEngagement.toFixed(2)),
              conversions: Math.round(conversions),
              bounce_rate: Number(bounceRate.toFixed(4)),
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: "page_path,date_range" },
          );
        if (error) {
          console.error(`page_metrics upsert failed [${key} ${pagePath}]:`, error);
        } else {
          pageCount++;
        }
      }

      // ----- traffic sources (top 5 by sessions) -----
      const srcReport = await runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      });

      const srcRows = (srcReport.rows ?? []) as any[];
      let srcCount = 0;
      for (const row of srcRows) {
        const source = row?.dimensionValues?.[0]?.value as string | undefined;
        if (!source) continue;
        const sessions = getMetricValue(row, 0);
        const { error } = await supabase
          .from("ga4_traffic_sources")
          .upsert(
            {
              source,
              date_range: key,
              sessions: Math.round(sessions),
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: "source,date_range" },
          );
        if (error) {
          console.error(`traffic_sources upsert failed [${key} ${source}]:`, error);
        } else {
          srcCount++;
        }
      }

      summary[key] = { pages: pageCount, sources: srcCount };
    }

    console.log("GA4 sync complete:", summary);
    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sync-ga4-metrics error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
