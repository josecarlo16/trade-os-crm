import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional parameters
    let limit: number | null = null;
    let specificId: string | null = null;
    
    try {
      const body = await req.json();
      limit = body.limit || null;
      specificId = body.id || null;
    } catch {
      // No body provided, that's fine
    }

    // Build query for equipment pages missing descriptions
    let query = supabase
      .from('equipment_pages')
      .select('id, brand, model_number, equipment_type, specs')
      .is('custom_content', null);

    if (specificId) {
      query = supabase
        .from('equipment_pages')
        .select('id, brand, model_number, equipment_type, specs')
        .eq('id', specificId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: pages, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch equipment pages: ${fetchError.message}`);
    }

    if (!pages || pages.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No equipment pages need descriptions',
          processed: 0,
          failed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pages.length} equipment pages to process`);

    let processed = 0;
    let failed = 0;
    const results: { id: string; brand: string; model: string; status: string }[] = [];

    for (const page of pages) {
      try {
        console.log(`Processing ${page.brand} ${page.model_number}...`);

        // Extract specs for the prompt
        const specs = page.specs as Record<string, unknown> || {};
        const tonnage = specs.tonnage || 'Not specified';
        const seerRating = specs.seer_rating || 'Not specified';
        const refrigerant = specs.refrigerant || 'Not specified';

        // Generate SEO-optimized product description
        const descriptionPrompt = `Write a 150-200 word SEO-optimized product description for this HVAC equipment:

Brand: ${page.brand}
Model Number: ${page.model_number}
Equipment Type: ${page.equipment_type || 'HVAC Equipment'}
Tonnage: ${tonnage}
SEER Rating: ${seerRating}
Refrigerant: ${refrigerant}

Guidelines:
- Write in a professional, informative tone
- Include the brand and model number naturally
- Mention key specifications and their benefits
- Include relevant use cases (residential cooling, home comfort, etc.)
- Mention energy efficiency if SEER rating is available
- Reference modern refrigerant standards if applicable
- Do NOT include warranty information or pricing
- Do NOT use marketing hyperbole or superlatives
- Write 2-3 paragraphs of plain text (no markdown, no bullet points)`;

        const descResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{ role: 'user', content: descriptionPrompt }],
          }),
        });

        if (!descResponse.ok) {
          throw new Error(`AI API returned ${descResponse.status}`);
        }

        const descData = await descResponse.json();
        const customContent = descData.choices?.[0]?.message?.content?.trim();

        if (!customContent) {
          throw new Error('No content generated');
        }

        // Update the equipment page with the generated description
        const { error: updateError } = await supabase
          .from('equipment_pages')
          .update({ custom_content: customContent })
          .eq('id', page.id);

        if (updateError) {
          throw new Error(`Failed to update: ${updateError.message}`);
        }

        processed++;
        results.push({
          id: page.id,
          brand: page.brand,
          model: page.model_number,
          status: 'success'
        });

        console.log(`✓ Generated description for ${page.brand} ${page.model_number}`);

        // Add delay between API calls to avoid rate limiting (1 second)
        if (pages.indexOf(page) < pages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (itemError) {
        failed++;
        const errorMessage = itemError instanceof Error ? itemError.message : String(itemError);
        results.push({
          id: page.id,
          brand: page.brand,
          model: page.model_number,
          status: `failed: ${errorMessage}`
        });
        console.error(`✗ Failed for ${page.brand} ${page.model_number}:`, itemError);
        // Continue processing other items
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} equipment pages, ${failed} failed`,
        processed,
        failed,
        total: pages.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
