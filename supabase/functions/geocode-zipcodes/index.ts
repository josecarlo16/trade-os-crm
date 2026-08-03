import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  zipCodes: string[];
}

interface GeocodeResult {
  zip: string;
  lat: number;
  lng: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY not configured');
    }

    const { zipCodes } = await req.json() as GeocodeRequest;
    
    if (!zipCodes || !Array.isArray(zipCodes) || zipCodes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'zipCodes array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 50 zip codes per request to avoid timeouts
    const limitedZipCodes = zipCodes.slice(0, 50);
    const results: GeocodeResult[] = [];

    for (const zip of limitedZipCodes) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip + ', USA')}&key=${apiKey}`
        );
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
          const location = data.results[0].geometry.location;
          results.push({
            zip,
            lat: location.lat,
            lng: location.lng,
          });
        } else {
          console.error(`Geocoding failed for ${zip}:`, data.status);
          results.push({
            zip,
            lat: 0,
            lng: 0,
            error: data.status || 'Unknown error',
          });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error geocoding ${zip}:`, errorMessage);
        results.push({
          zip,
          lat: 0,
          lng: 0,
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        } 
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Geocode function error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
