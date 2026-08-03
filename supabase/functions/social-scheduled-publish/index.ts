// social-scheduled-publish — invoked by pg_cron every ~5 min.
// Finds scheduled targets whose parent post.scheduled_for <= now() and publishes each.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const nowIso = new Date().toISOString()

    const { data: due, error } = await supabase
      .from('crm_social_post_targets')
      .select('id, post_id, crm_social_posts!inner(scheduled_for, status)')
      .eq('status', 'scheduled')
      .lte('crm_social_posts.scheduled_for', nowIso)
      .limit(50)

    if (error) throw error

    const results: any[] = []
    for (const row of (due || [])) {
      const { data, error: invErr } = await supabase.functions.invoke('social-publish', {
        body: { post_id: row.post_id, target_id: row.id },
      })
      results.push({ target_id: row.id, ok: !invErr, data, error: invErr?.message })
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('social-scheduled-publish error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
