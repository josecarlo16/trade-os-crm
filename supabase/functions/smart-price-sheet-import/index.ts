import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const XAI_API_KEY = Deno.env.get('XAI_API_KEY')!;

// AI-based price-sheet extraction for manufacturer PDFs we don't have a
// hand-written parser for (see src/lib/mitsubishiPdfParser.ts for the fast,
// free, regex-based path used for Mitsubishi's known layout). This is the
// general fallback: any vendor's catalog, read by a model instead of a
// format-specific parser. Uses xAI's OpenAI-compatible API (same provider
// as ai-assistant/harold-api) rather than Lovable's AI Gateway, which isn't
// reachable outside Lovable-hosted environments. Same ai_config/
// ai_request_logs logging conventions as decode-equipment and kb-translate.

const EXTRACT_TOOL = {
  type: 'function',
  function: {
    name: 'extract_pricing_rows',
    description:
      'Extract HVAC equipment pricing rows from price-sheet text. Classify each row as either a bundled system (multiple components sold together with one price) or a standalone item (a single priced component/accessory).',
    parameters: {
      type: 'object',
      properties: {
        system_rows: {
          type: 'array',
          description: 'Bundled multi-component systems (e.g. indoor + outdoor unit pair) with one combined price.',
          items: {
            type: 'object',
            properties: {
              system_name: { type: 'string', description: 'A short descriptive name for this system' },
              indoor_model: { type: ['string', 'null'] },
              outdoor_model: { type: ['string', 'null'] },
              capacity_btuh: { type: ['number', 'null'] },
              seer2: { type: ['number', 'null'] },
              hspf2: { type: ['number', 'null'] },
              eer2: { type: ['number', 'null'] },
              ahri_number: { type: ['string', 'null'] },
              price: { type: 'number' },
              notes: { type: ['string', 'null'] },
            },
            required: ['system_name', 'price'],
          },
        },
        item_rows: {
          type: 'array',
          description: 'Standalone priced line items/components/accessories.',
          items: {
            type: 'object',
            properties: {
              brand: { type: 'string' },
              model_number: { type: 'string' },
              type: { type: 'string', description: 'e.g. Condenser, Air Handler, Coil, Thermostat, Other' },
              price: { type: 'number' },
              notes: { type: ['string', 'null'] },
            },
            required: ['brand', 'model_number', 'price'],
          },
        },
        warning: {
          type: ['string', 'null'],
          description: 'Note any content you could not confidently parse (e.g. unclear tables, truncated text).',
        },
      },
      required: ['system_rows', 'item_rows'],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const t0 = Date.now();
  let provider = 'xai';
  let model = 'grok-3-mini';

  try {
    const { pdf_text } = (await req.json().catch(() => ({}))) as { pdf_text?: string };
    if (!pdf_text || !pdf_text.trim()) {
      return new Response(JSON.stringify({ error: 'pdf_text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { data: cfg } = await supabase
      .from('ai_config')
      .select('provider, model, temperature')
      .eq('config_key', 'price_sheet_import')
      .maybeSingle();

    provider = cfg?.provider || provider;
    model = cfg?.model || model;
    const temperature = Number(cfg?.temperature ?? 0.1);

    const userPrompt = `Extract EVERY priced equipment row from the following price-sheet text (extracted from a PDF, so table columns may be joined with spaces rather than aligned). This text may contain dozens of rows — you must include ALL of them, not a sample or a few examples. Do not skip, summarize, or truncate the list. Call the extract_pricing_rows function once with the complete set of rows found in this text. Leave a field null if you can't determine it rather than guessing.

Price sheet text:
${pdf_text}`;

    const aiRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${XAI_API_KEY}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: userPrompt }],
        temperature,
        max_tokens: 8000,
        tools: [EXTRACT_TOOL],
        tool_choice: { type: 'function', function: { name: 'extract_pricing_rows' } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      await supabase.from('ai_request_logs').insert({
        config_key: 'price_sheet_import',
        provider,
        model,
        action: 'extract_pricing_rows',
        status: aiRes.status === 429 ? 'rate_limited' : aiRes.status === 402 ? 'credits_exhausted' : 'error',
        error_message: errText.slice(0, 500),
        duration_ms: Date.now() - t0,
        user_id: userId,
      });
      return new Response(
        JSON.stringify({
          error:
            aiRes.status === 429
              ? 'Rate limit. Please try again shortly.'
              : aiRes.status === 402
              ? 'AI credits exhausted. Add credits in workspace settings.'
              : 'PDF import failed',
        }),
        { status: aiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const aiData = await aiRes.json();
    let parsed: any = { system_rows: [], item_rows: [], warning: null };
    const toolArgs = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (toolArgs) {
      try {
        parsed = JSON.parse(toolArgs);
      } catch {
        // fall through with default empty result
      }
    } else {
      const content = aiData.choices?.[0]?.message?.content;
      const m = content?.match?.(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          // fall through with default empty result
        }
      }
    }

    await supabase.from('ai_request_logs').insert({
      config_key: 'price_sheet_import',
      provider,
      model,
      action: 'extract_pricing_rows',
      input_tokens: aiData.usage?.prompt_tokens ?? null,
      output_tokens: aiData.usage?.completion_tokens ?? null,
      duration_ms: Date.now() - t0,
      status: 'success',
      user_id: userId,
    });

    return new Response(
      JSON.stringify({
        systems: Array.isArray(parsed.system_rows) ? parsed.system_rows : [],
        items: Array.isArray(parsed.item_rows) ? parsed.item_rows : [],
        warning: parsed.warning ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('smart-price-sheet-import error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
