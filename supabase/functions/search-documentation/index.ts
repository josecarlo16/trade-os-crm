import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentResult {
  document_url: string;
  document_title: string | null;
  document_type: string;
  source_domain: string | null;
  file_type: string | null;
  search_query_used: string;
}

function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

function extractFileType(url: string): string | null {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : null;
}

function inferDocumentType(title: string, url: string, query: string): string {
  const text = `${title} ${url} ${query}`.toLowerCase();
  if (text.includes('submittal')) return 'submittal';
  if (text.includes('manual') || text.includes('installation')) return 'manual';
  if (text.includes('wiring')) return 'wiring_diagram';
  if (text.includes('spec') || text.includes('specification')) return 'spec_sheet';
  return 'other';
}

function isPdfOrDocument(url: string): boolean {
  const docExtensions = ['.pdf', '.doc', '.docx'];
  return docExtensions.some(ext => url.toLowerCase().includes(ext));
}

function generateModelPattern(brand: string, modelNumber: string): string {
  const patterns: Record<string, (m: string) => string> = {
    carrier: (m) => m.substring(0, 6),
    trane: (m) => m.replace(/\d{3,}[A-Z]*$/, ''),
    lennox: (m) => m.split('-')[0],
    goodman: (m) => m.substring(0, 7),
    rheem: (m) => m.substring(0, 8),
    default: (m) => m.substring(0, Math.min(8, m.length))
  };
  
  const patternFn = patterns[brand.toLowerCase()] || patterns.default;
  return patternFn(modelNumber.toUpperCase());
}

function normalizeBrandName(brand: string): string {
  // Capitalize first letter of each word
  return brand.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { brand, model_number } = await req.json();

    if (!brand || !model_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'Brand and model_number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching documentation for ${brand} ${model_number}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate model pattern for broader cache hits
    const modelPattern = generateModelPattern(brand, model_number);
    const normalizedBrand = normalizeBrandName(brand);

    // Check cache first - try exact match then pattern match (case-insensitive)
    const { data: cachedDocs, error: cacheError } = await supabase
      .from('equipment_documentation')
      .select('*')
      .ilike('brand', brand)
      .or(`model_number.eq.${model_number},model_pattern.eq.${modelPattern}`);

    if (cacheError) {
      console.error('Cache lookup error:', cacheError);
    }

    if (cachedDocs && cachedDocs.length > 0) {
      console.log(`Cache hit! Found ${cachedDocs.length} cached documents`);
      
      // Update documentation_count on equipment_pages (count ALL docs for this model)
      const { count: totalDocs } = await supabase
        .from('equipment_documentation')
        .select('*', { count: 'exact', head: true })
        .ilike('model_number', model_number)
        .eq('verified_working', true);

      if (totalDocs !== null && totalDocs > 0) {
        await supabase
          .from('equipment_pages')
          .update({ documentation_count: totalDocs })
          .ilike('model_number', model_number);
        console.log(`Updated equipment_pages documentation_count to ${totalDocs}`);
      }
      
      // Log the search
      const duration = Date.now() - startTime;
      await supabase.from('documentation_search_log').insert({
        brand: normalizedBrand,
        model_number,
        cache_hit: true,
        documents_found: cachedDocs.length,
        search_duration_ms: duration,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          cache_hit: true, 
          documents: cachedDocs 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cache miss - use Firecrawl to search
    console.log('Cache miss, searching with Firecrawl...');
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Documentation search not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search queries
    const searchQueries = [
      `${brand} ${model_number} submittal sheet PDF`,
      `${brand} ${model_number} installation manual PDF`,
      `${brand} ${model_number} wiring diagram PDF`,
      `${brand} ${model_number} specifications PDF`,
    ];

    const allResults: DocumentResult[] = [];

    // Execute searches sequentially with delay to avoid rate limiting
    for (const query of searchQueries) {
      try {
        console.log(`Searching: ${query}`);
        
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: 5,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Found ${data.data?.length || 0} results for query`);
          
          if (data.data && Array.isArray(data.data)) {
            for (const result of data.data) {
              const url = result.url || '';
              
              // Only include PDF documents
              if (isPdfOrDocument(url)) {
                allResults.push({
                  document_url: url,
                  document_title: result.title || null,
                  document_type: inferDocumentType(result.title || '', url, query),
                  source_domain: extractDomain(url),
                  file_type: extractFileType(url),
                  search_query_used: query,
                });
              }
            }
          }
        } else {
          console.error(`Firecrawl search failed for query: ${query}`, await response.text());
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error searching for ${query}:`, error);
      }
    }

    // Deduplicate by URL
    const uniqueResults = allResults.filter((result, index, self) =>
      index === self.findIndex(r => r.document_url === result.document_url)
    );

    console.log(`Total unique documents found: ${uniqueResults.length}`);

    // Cache the results
    if (uniqueResults.length > 0) {
      const docsToCache = uniqueResults.map(doc => ({
        brand: normalizedBrand,
        model_number,
        model_pattern: modelPattern,
        document_type: doc.document_type,
        document_title: doc.document_title,
        document_url: doc.document_url,
        source_domain: doc.source_domain,
        file_type: doc.file_type,
        search_query_used: doc.search_query_used,
        verified_working: true,
      }));

      const { error: insertError } = await supabase
        .from('equipment_documentation')
        .upsert(docsToCache, { 
          onConflict: 'brand,model_pattern,document_type,document_url',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('Error caching documents:', insertError);
      } else {
        console.log(`Cached ${docsToCache.length} documents`);
      }
      
      // Count ALL docs for this model (including newly cached ones)
      const { count: totalDocs } = await supabase
        .from('equipment_documentation')
        .select('*', { count: 'exact', head: true })
        .ilike('model_number', model_number)
        .eq('verified_working', true);

      if (totalDocs !== null && totalDocs > 0) {
        const { error: updateError } = await supabase
          .from('equipment_pages')
          .update({ documentation_count: totalDocs })
          .ilike('model_number', model_number);
        
        if (updateError) {
          console.error('Error updating equipment page doc count:', updateError);
        } else {
          console.log(`Updated equipment_pages documentation_count to ${totalDocs}`);
        }
      }
    }

    // Log the search
    const duration = Date.now() - startTime;
    await supabase.from('documentation_search_log').insert({
      brand: normalizedBrand,
      model_number,
      cache_hit: false,
      documents_found: uniqueResults.length,
      search_duration_ms: duration,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        cache_hit: false, 
        documents: uniqueResults 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-documentation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to search documentation';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
