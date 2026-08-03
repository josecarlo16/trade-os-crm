// Triggers a production deploy by POSTing to the Vercel deploy hook.
// The hook URL is stored in the secret VERCEL_DEPLOY_HOOK_URL.
// Requires an authenticated admin, manager, or super_admin caller.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return json({ success: false, error: 'Server misconfigured' }, 500);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const userId = claimsData.claims.sub as string;

  // Same role gating as /admin/seo — admin, manager, or super_admin.
  const { data: roleRows, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (roleErr) {
    return json({ success: false, error: 'Role lookup failed' }, 500);
  }

  const roles = new Set((roleRows ?? []).map((r: { role: string }) => r.role));
  const allowed = roles.has('super_admin') || roles.has('admin') || roles.has('manager');
  if (!allowed) {
    return json({ success: false, error: 'Forbidden' }, 403);
  }

  const hookUrl = Deno.env.get('VERCEL_DEPLOY_HOOK_URL');
  if (!hookUrl) {
    return json(
      {
        success: false,
        error: 'deploy hook not configured — tell Eric to add VERCEL_DEPLOY_HOOK_URL secret',
      },
      503,
    );
  }

  try {
    const res = await fetch(hookUrl, { method: 'POST' });
    const bodyText = await res.text();
    if (!res.ok) {
      return json(
        { success: false, error: `Vercel hook responded ${res.status}`, detail: bodyText.slice(0, 500) },
        502,
      );
    }
    let parsed: unknown = null;
    try { parsed = JSON.parse(bodyText); } catch { /* ignore */ }
    return json({ success: true, triggered_at: new Date().toISOString(), vercel: parsed });
  } catch (err) {
    return json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
