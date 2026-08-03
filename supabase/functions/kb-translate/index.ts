import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!

interface MediaItem {
  id: string
  caption_en: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const t0 = Date.now()
  let provider = 'lovable'
  let model = 'google/gemini-2.5-flash'

  try {
    const body = await req.json().catch(() => ({}))
    const { title_en, content_en, media } = body as {
      title_en?: string
      content_en?: string
      media?: MediaItem[]
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Identify user (for ai_request_logs)
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id ?? null
    }

    // Load AI config
    const { data: cfg } = await supabase
      .from('ai_config')
      .select('provider, model, temperature, max_tokens, system_prompt')
      .eq('config_key', 'knowledge_base')
      .maybeSingle()

    provider = cfg?.provider || provider
    model = cfg?.model || model
    const temperature = Number(cfg?.temperature ?? 0.2)
    const maxTokens = Number(cfg?.max_tokens ?? 4000)
    const systemPrompt = cfg?.system_prompt ||
      'You are a professional HVAC technical translator. Translate English content to Mexican Spanish faithfully, preserving markdown formatting, code, model numbers, part numbers, brand names, and technical terms verbatim.'

    const payload = {
      title_en: title_en || '',
      content_en: content_en || '',
      media: (media || []).map(m => ({ id: m.id, caption_en: m.caption_en || '' })),
    }

    const userPrompt = `Translate the following Knowledge Base article from English to Mexican Spanish.
Return ONLY valid JSON matching this exact shape (no markdown code fences, no commentary):
{
  "title_es": "string",
  "content_es": "string",
  "captions": [{ "id": "string", "caption_es": "string" }]
}

Rules:
- Preserve markdown formatting exactly (headings, lists, links, code blocks).
- Do NOT translate model numbers, part numbers, brand names, or code identifiers.
- Keep a clear, instructional tone suitable for HVAC field technicians.
- If a caption_en is empty, return an empty caption_es for that id.

Source article (JSON):
${JSON.stringify(payload)}`

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      await supabase.from('ai_request_logs').insert({
        config_key: 'knowledge_base',
        provider, model,
        action: 'translate',
        status: aiRes.status === 429 ? 'rate_limited' : aiRes.status === 402 ? 'credits_exhausted' : 'error',
        error_message: errText.slice(0, 500),
        duration_ms: Date.now() - t0,
        user_id: userId,
      })
      return new Response(
        JSON.stringify({ error: aiRes.status === 429 ? 'Rate limit. Please try again shortly.' : aiRes.status === 402 ? 'AI credits exhausted. Add credits in workspace settings.' : 'Translation failed', detail: errText }),
        { status: aiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiData = await aiRes.json()
    const raw = aiData.choices?.[0]?.message?.content || '{}'
    let parsed: any = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) parsed = JSON.parse(m[0])
    }

    await supabase.from('ai_request_logs').insert({
      config_key: 'knowledge_base',
      provider, model,
      action: 'translate',
      input_tokens: aiData.usage?.prompt_tokens ?? null,
      output_tokens: aiData.usage?.completion_tokens ?? null,
      duration_ms: Date.now() - t0,
      status: 'success',
      user_id: userId,
    })

    return new Response(JSON.stringify({
      title_es: parsed.title_es || '',
      content_es: parsed.content_es || '',
      captions: Array.isArray(parsed.captions) ? parsed.captions : [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('kb-translate error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
