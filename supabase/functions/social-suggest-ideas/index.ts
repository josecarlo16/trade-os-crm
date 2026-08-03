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

const ALL_PLATFORMS = ['google_business', 'facebook', 'instagram', 'tiktok']
const ALL_PILLARS = ['comfort', 'energy_costs', 'equipment_education', 'how_we_think', 'proof']

export async function generateIdeas(opts: {
  provider?: string
  model?: string
  count?: number
  pillar?: string | null
  platforms?: string[] | null
  useJobData?: boolean
  userId?: string | null
}) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const started = Date.now()

  const useModel = opts.model || 'google/gemini-2.5-flash'
  const useProvider = opts.provider || 'lovable'
  const count = Math.max(1, Math.min(10, opts.count ?? 5))
  const platforms = (opts.platforms && opts.platforms.length > 0) ? opts.platforms : ALL_PLATFORMS
  const useJobData = opts.useJobData !== false

  // Load active strategy
  const { data: strategy } = await supabase
    .from('crm_social_strategy')
    .select('content')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Real-context grounding (direct queries — no NL layer)
  let groundingBlock = ''
  if (useJobData) {
    const [jobsRes, locationsRes, equipRes] = await Promise.all([
      supabase
        .from('crm_jobs')
        .select('title, scheduled_date, crm_job_types(name), crm_locations(city, zip_code)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('seo_location_pages')
        .select('neighborhood, city')
        .eq('published', true)
        .order('updated_at', { ascending: false })
        .limit(8),
      supabase
        .from('crm_location_equipment')
        .select('equipment_type, brand, model_number, estimated_age, tonnage')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    const jobsLines = (jobsRes.data || []).map((j: any) => {
      const type = j.crm_job_types?.name || 'job'
      const city = j.crm_locations?.city || ''
      return `- ${type}${city ? ` in ${city}` : ''}: ${j.title || ''}`.trim()
    })
    const locLines = (locationsRes.data || []).map((l: any) =>
      `- ${l.neighborhood || ''}${l.neighborhood && l.city ? ', ' : ''}${l.city || ''}`.trim()
    ).filter((s: string) => s !== '-')
    const equipLines = (equipRes.data || []).map((e: any) => {
      const parts = [e.brand, e.model_number, e.equipment_type, e.tonnage ? `${e.tonnage}t` : '', e.estimated_age ? `${e.estimated_age}yr` : '']
        .filter(Boolean).join(' ')
      return `- ${parts}`
    })

    groundingBlock = `\n\n=== RECENT REAL CONTEXT (use for specific hooks, do not invent customer PII) ===\nRecent jobs:\n${jobsLines.join('\n') || '(none)'}\n\nServed cities / neighborhoods:\n${locLines.join('\n') || '(none)'}\n\nRecent equipment seen:\n${equipLines.join('\n') || '(none)'}\n=== END REAL CONTEXT ===`
  }

  const platformList = platforms.map(p => `- ${PLATFORM_LABELS[p] || p}`).join('\n')
  const pillarGuidance = opts.pillar
    ? `Bias every idea to the "${opts.pillar}" pillar.`
    : `Spread the ${count} ideas across the five pillars (${ALL_PILLARS.join(', ')}) — do not pick only one.`

  const systemPrompt = `You are Bach, Truficient HVAC's in-house content strategist. Generate strong, on-strategy social post IDEAS — not finished copy. Anchor every idea to the strategy doc below (80/20 educate-first, five pillars, per-platform format/cadence).

Each idea must have a scroll-stopping hook, a clear angle, the pillar, the platform(s) it fits best, AND the specific content format. When real context is provided, prefer ideas that reference real cities, equipment, or job types — never invent customer PII (no last names, no addresses).

Pick the format that best matches the suggested platform(s):
- reel — vertical short video for Instagram/Facebook (15-60s)
- short_video — vertical short video for TikTok (15-60s)
- carousel — multi-slide image post (Instagram/Facebook)
- photo_post — single static image with caption (Instagram/Facebook)
- story — 24-hr vertical Story (Instagram/Facebook)
- text_post — primarily text (Facebook update, long-form)
- gmb_update — Google Business "What's New" post with photo
- gmb_offer — Google Business "Offer" post (discount/promo)
- gmb_event — Google Business "Event" post (dated)

Return ONLY a JSON array of exactly ${count} objects. No preamble. No markdown fences. No trailing commentary. Schema for each object:
{
  "hook": "string — opening line / scroll-stopper",
  "angle": "string — 1-2 sentences on the content approach and why it works",
  "pillar": "comfort | energy_costs | equipment_education | how_we_think | proof",
  "suggested_platforms": ["google_business" | "facebook" | "instagram" | "tiktok", ...],
  "format": "reel | short_video | carousel | photo_post | story | text_post | gmb_update | gmb_offer | gmb_event",
  "source_context": "string — the real job/city/equipment that seeded it, or 'evergreen' if none"
}

=== TRUFICIENT STRATEGY DOC ===
${strategy?.content || '(no strategy doc found — fall back to general HVAC best practices)'}
=== END STRATEGY DOC ===${groundingBlock}`

  const userPrompt = `Generate ${count} post ideas now.
${pillarGuidance}
Target platforms (bias toward these):
${platformList}

Return the JSON array only.`

  // GPT-5 family uses `max_completion_tokens` and does not accept custom temperature
  const isGpt5 = /^openai\/gpt-5/i.test(useModel)
  const aiBody: Record<string, unknown> = {
    model: useModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }
  if (isGpt5) {
    // GPT-5 reasoning models consume tokens internally before emitting output —
    // give plenty of headroom or `content` comes back empty.
    aiBody.max_completion_tokens = 8000
  } else {
    aiBody.max_tokens = 2200
    aiBody.temperature = 0.9
  }
  const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify(aiBody),
  })

  if (aiRes.status === 429) {
    return { ok: false, status: 429, error: 'Rate limit reached. Try again shortly.' }
  }
  if (aiRes.status === 402) {
    return { ok: false, status: 402, error: 'AI credits exhausted. Add credits in Lovable AI Gateway.' }
  }
  if (!aiRes.ok) {
    const t = await aiRes.text()
    return { ok: false, status: aiRes.status, error: `AI gateway error ${aiRes.status}: ${t}` }
  }

  const aiData = await aiRes.json()
  let raw: string = aiData.choices?.[0]?.message?.content || ''

  // Strip accidental ```json fences
  raw = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let ideas: any[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('not an array')
    ideas = parsed
  } catch (e) {
    return { ok: false, status: 502, error: `Failed to parse Bach response as JSON array: ${e instanceof Error ? e.message : String(e)}`, raw }
  }

  const ALL_FORMATS = ['reel', 'short_video', 'carousel', 'photo_post', 'story', 'text_post', 'gmb_update', 'gmb_offer', 'gmb_event']

  // Light validation/normalization
  const valid = ideas
    .filter(i => i && typeof i.hook === 'string' && i.hook.trim().length > 0)
    .map(i => ({
      hook: String(i.hook).trim(),
      angle: typeof i.angle === 'string' ? i.angle.trim() : '',
      pillar: ALL_PILLARS.includes(i.pillar) ? i.pillar : (opts.pillar || null),
      suggested_platforms: Array.isArray(i.suggested_platforms)
        ? i.suggested_platforms.filter((p: any) => ALL_PLATFORMS.includes(p))
        : platforms,
      format: typeof i.format === 'string' && ALL_FORMATS.includes(i.format) ? i.format : null,
      source_context: typeof i.source_context === 'string' ? i.source_context.trim() : 'evergreen',
    }))

  // Log
  try {
    await supabase.from('assistant_logs').insert({
      user_id: opts.userId || null,
      user_message: `[SOCIAL-SUGGEST] count=${count} pillar=${opts.pillar || 'all'} platforms=${platforms.join(',')} useJobData=${useJobData} model=${useModel}`,
      assistant_response: JSON.stringify(valid).slice(0, 8000),
      duration_ms: Date.now() - started,
    })
  } catch (_e) { /* non-fatal */ }

  return { ok: true, ideas: valid, model: useModel, provider: useProvider }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    let userId: string | null = null
    if (token) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data: userData } = await sb.auth.getUser(token)
      userId = userData?.user?.id || null
    }

    const body = await req.json().catch(() => ({}))
    const result = await generateIdeas({
      provider: body.provider,
      model: body.model,
      count: body.count,
      pillar: body.pillar,
      platforms: body.platforms,
      useJobData: body.useJobData,
      userId,
    })

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error, raw: (result as any).raw }), {
        status: (result as any).status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ideas: result.ideas, model: result.model, provider: result.provider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('social-suggest-ideas error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
