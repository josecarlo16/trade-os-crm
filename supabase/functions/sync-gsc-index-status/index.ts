// Daily Google Search Console URL Inspection sync.
// Calls GSC URL Inspection API for every page in public.page_seo and
// writes the verdict back to index_status ('indexed' | 'not_indexed' | 'pending').
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
  // Handle: literal "\n" sequences, surrounding quotes, JSON-escaped quotes,
  // and accidental whitespace from secret-form pastes.
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

// Monday (00:00 UTC) of the current week, ISO date string (YYYY-MM-DD).
function mondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// ---------- GSC verdict → our enum ----------
// `coverageState` is the most reliable signal — it's the same string GSC shows
// in the UI ("Submitted and indexed", "Crawled - currently not indexed", etc.).
// `verdict` alone misclassifies NEUTRAL/PARTIAL pages that are actually indexed.
function verdictToStatus(verdict: string | undefined, coverage: string | undefined): string {
  if (coverage) {
    const c = coverage.toLowerCase();
    // Anything that says "indexed" without a "not"/"currently not" prefix is indexed.
    if (/\bindexed\b/.test(c) && !/not\s+indexed|currently not indexed/.test(c)) {
      return "indexed";
    }
    if (/unknown|not on google|excluded|not indexed|redirect|noindex|blocked|duplicate|crawled - currently/.test(c)) {
      return "not_indexed";
    }
  }
  if (verdict === "PASS") return "indexed";
  if (verdict === "FAIL") return "not_indexed";
  return "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientEmail = Deno.env.get("GSC_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GSC_PRIVATE_KEY");
    const siteUrl = Deno.env.get("GSC_SITE_URL");
    if (!clientEmail) throw new Error("GSC_CLIENT_EMAIL is not configured");
    if (!privateKey) throw new Error("GSC_PRIVATE_KEY is not configured");
    if (!siteUrl) throw new Error("GSC_SITE_URL is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optional: ?limit=N&offset=N for manual re-runs / chunking
    const url = new URL(req.url);
    if (url.searchParams.get("diag") === "1") {
      return new Response(JSON.stringify({
        client_email_set: !!clientEmail,
        client_email_preview: clientEmail.slice(0, 25) + "…",
        site_url: siteUrl,
        private_key_length: privateKey.length,
        private_key_starts_with: privateKey.slice(0, 35),
        has_begin_marker: privateKey.includes("BEGIN PRIVATE KEY"),
        has_literal_backslash_n: privateKey.includes("\\n"),
        has_real_newline: privateKey.includes("\n"),
        is_quote_wrapped: privateKey.startsWith('"') || privateKey.startsWith("'"),
      }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 2000), 2000);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const { data: pages, error: fetchErr } = await supabase
      .from("page_seo")
      .select("id, page_path")
      .order("updated_at", { ascending: true })
      .range(offset, offset + limit - 1);
    if (fetchErr) throw fetchErr;

    const accessToken = await getAccessToken(clientEmail, privateKey);
    const baseHost = "https://truficient.com";

    const weekStarting = mondayOfCurrentWeek();
    let indexed = 0, notIndexed = 0, pending = 0, errors = 0, snapshotsWritten = 0;

    for (const page of pages ?? []) {
      const rawPath = page.page_path?.startsWith("/") ? page.page_path : `/${page.page_path}`;
      // Match sitemap: prerendered pages are served at <path>.html on Lovable Hosting,
      // so GSC indexed them at the .html URL. Inspect that exact URL or GSC reports
      // the extensionless variant as "not indexed".
      const trimmed = rawPath.replace(/\/+$/, "");
      const pagePath = !trimmed || trimmed === ""
        ? "/"
        : /\.[a-z0-9]{2,5}$/i.test(trimmed)
          ? trimmed
          : `${trimmed}.html`;
      const inspectionUrl = `${baseHost}${pagePath}`;

      try {
        const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inspectionUrl, siteUrl }),
        });
        const json = await res.json();
        if (!res.ok) {
          console.error(`GSC inspect failed for ${inspectionUrl} [${res.status}]:`, json);
          errors++;
          continue;
        }
        const result = json?.inspectionResult?.indexStatusResult;
        const status = verdictToStatus(result?.verdict, result?.coverageState);
        if (status === "indexed") indexed++;
        else if (status === "not_indexed") notIndexed++;
        else pending++;

        await supabase
          .from("page_seo")
          .update({
            index_status: status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", page.id);

        // Read latest performance metrics from page_seo and snapshot them
        // for week-over-week comparisons.
        const { data: metricsRow } = await supabase
          .from("page_seo")
          .select("gsc_clicks, gsc_impressions, avg_position")
          .eq("id", page.id)
          .maybeSingle();

        const { error: snapErr } = await supabase
          .from("page_seo_gsc_snapshots")
          .upsert(
            {
              page_id: page.id,
              week_starting: weekStarting,
              clicks: metricsRow?.gsc_clicks ?? 0,
              impressions: metricsRow?.gsc_impressions ?? 0,
              avg_position: metricsRow?.avg_position ?? null,
            },
            { onConflict: "page_id,week_starting" },
          );
        if (snapErr) {
          console.error(`Snapshot upsert failed for ${page.id}:`, snapErr);
        } else {
          snapshotsWritten++;
        }
      } catch (e) {
        console.error(`Error inspecting ${inspectionUrl}:`, e);
        errors++;
      }

      // Light pacing — GSC URL Inspection limit ~600 QPM (= 100ms min); use 110ms for safety
      await new Promise(r => setTimeout(r, 110));
    }

    const summary = {
      checked: pages?.length ?? 0,
      indexed,
      not_indexed: notIndexed,
      pending,
      errors,
      snapshots_written: snapshotsWritten,
      week_starting: weekStarting,
      offset,
      limit,
    };
    console.log("GSC sync complete:", summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sync-gsc-index-status error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
