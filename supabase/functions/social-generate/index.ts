import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!

const PLATFORM_LABELS: Record<string, string> = {
  google_business: 'Google Business Profile',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const started = Date.now()
  let userId: string | null = null

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    if (token) {
      const { data: userData } = await supabase.auth.getUser(token)
      userId = userData?.user?.id || null
    }

    const { pillar, platforms, provider, model, seedText } = await req.json()

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return new Response(JSON.stringify({ error: 'platforms must be a non-empty array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const useModel = (typeof model === 'string' && model) ? model : 'google/gemini-2.5-flash'
    const useProvider = (typeof provider === 'string' && provider) ? provider : 'lovable'

    // Load active strategy
    const { data: strategy } = await supabase
      .from('crm_social_strategy')
      .select('content, title')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const platformList = platforms
      .map((p: string) => `- ${PLATFORM_LABELS[p] || p}`)
      .join('\n')

    const systemPrompt = `You are Bach, Truficient HVAC's in-house content assistant. You write social copy that obeys the Truficient strategy document below. Follow it strictly: 80/20 educate-first rule, the five pillars (Comfort, Energy Costs, Equipment Education, How We Think, Proof), and the per-platform format and cadence guidance.

When multiple platforms are requested, return a clearly labeled block for each platform, separated by a divider line of ---. Respect each platform's native format:
- Google Business Profile: 150–300 chars + a CTA link line, no hashtags.
- Facebook: short paragraphs, hook in line 1, CTA last; or a Reel script (15–45s).
- Instagram: front-load the first 125 chars; carousels = one idea per slide; remind that images need a public CDN URL.
- TikTok: vertical script, hook in the first 2–3 seconds, captions on screen. Note that TikTok output is draft-only until brand audit clears.

Never invent customer PII, addresses, or last names. Use real-sounding numbers only when reasonable. Plain-spoken, confident, never condescending.

=== TRUFICIENT STRATEGY DOC ===
${strategy?.content || '(no strategy doc found — fall back to general HVAC best practices)'}
=== END STRATEGY DOC ===`

    const userPrompt = `Pillar: ${pillar || '(not specified — choose the most appropriate)'}
Target platforms:
${platformList}

${seedText ? `Seed / starting notes from Eric:\n${seedText}\n\n` : ''}Generate the post copy now. Return only the copy blocks — no preamble, no closing remarks.`

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: useModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
      }),
    })

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit reached. Try again shortly.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in Lovable AI Gateway.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!aiRes.ok) {
      const t = await aiRes.text()
      throw new Error(`AI gateway error ${aiRes.status}: ${t}`)
    }

    const aiData = await aiRes.json()
    const content = aiData.choices?.[0]?.message?.content || ''

    // Log to assistant_logs
    try {
      await supabase.from('assistant_logs').insert({
        user_id: userId,
        user_message: `[SOCIAL-GENERATE] pillar=${pillar || ''} platforms=${platforms.join(',')} model=${useModel} provider=${useProvider}\nseed: ${seedText || ''}`,
        assistant_response: content,
        duration_ms: Date.now() - started,
      })
    } catch (_logErr) {
      // non-fatal
    }

    return new Response(JSON.stringify({ content, model: useModel, provider: useProvider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('social-generate error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
