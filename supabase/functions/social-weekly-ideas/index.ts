// social-weekly-ideas
// Scaffold-only entry point intended for a future pg_cron schedule.
// INTENTIONALLY UNSCHEDULED — Prompt 3 (or a later toggle) will wire the cron.
// When invoked, this invokes social-suggest-ideas (count 5, useJobData true,
// spread across pillars) and inserts the results directly as status='suggested'
// so Eric can review them in the Ideas tab.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase.functions.invoke('social-suggest-ideas', {
      body: { provider: 'lovable', model: 'google/gemini-2.5-flash', count: 5, useJobData: true },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)

    const ideas: any[] = data?.ideas || []
    const rows = ideas.map(i => ({
      hook: i.hook,
      angle: i.angle,
      pillar: i.pillar,
      suggested_platforms: i.suggested_platforms,
      format: i.format,
      source_context: i.source_context,
      status: 'suggested',
      ai_model: data?.model || 'google/gemini-2.5-flash',
    }))

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('crm_social_ideas').insert(rows)
      if (insErr) throw insErr
    }

    return new Response(JSON.stringify({ inserted: rows.length, model: data?.model }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('social-weekly-ideas error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
