const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PropertyLookupRequest {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface PropertyData {
  squareFootage: number | null;
  yearBuilt: number | null;
  stories: number | null;
  lotSizeSqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyClass: string | null;
  source: string;
}

interface LookupResult {
  data: PropertyData | null;
  error: string | null;
  attemptedSource: string;
}

async function rentcastLookup(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<LookupResult> {
  const source = "rentcast";
  const apiKey = Deno.env.get("RENTCAST_API_KEY");
  
  if (!apiKey) {
    console.error("RENTCAST_API_KEY not configured");
    return { 
      data: null, 
      error: "RentCast API key not configured. Please add RENTCAST_API_KEY secret.", 
      attemptedSource: source 
    };
  }

  try {
    const params = new URLSearchParams({
      address,
      city,
      state,
      zipCode,
    });

    console.log(`RentCast lookup: ${address}, ${city}, ${state} ${zipCode}`);

    const response = await fetch(`https://api.rentcast.io/v1/properties?${params}`, {
      headers: {
        "X-Api-Key": apiKey,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`RentCast API error: HTTP ${response.status} - ${errorText}`);
      return { 
        data: null, 
        error: `RentCast returned HTTP ${response.status}`, 
        attemptedSource: source 
      };
    }

    const results = await response.json();
    console.log(`RentCast response:`, JSON.stringify(results, null, 2));

    // RentCast returns an array of matching properties
    const property = Array.isArray(results) ? results[0] : results;

    if (!property) {
      console.log("No property found in RentCast response");
      return { 
        data: null, 
        error: "No property found for this address", 
        attemptedSource: source 
      };
    }

    console.log(`RentCast found property: sqft=${property.squareFootage}, year=${property.yearBuilt}`);

    return {
      data: {
        squareFootage: property.squareFootage || null,
        yearBuilt: property.yearBuilt || null,
        stories: property.stories || null,
        lotSizeSqft: property.lotSize || null,
        bedrooms: property.bedrooms || null,
        bathrooms: property.bathrooms || null,
        propertyClass: property.propertyType || null,
        source,
      },
      error: null,
      attemptedSource: source,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("RentCast lookup error:", errorMsg);
    return { 
      data: null, 
      error: `RentCast lookup failed: ${errorMsg}`, 
      attemptedSource: source 
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, city, state, zipCode } = (await req.json()) as PropertyLookupRequest;

    if (!address || !city || !zipCode) {
      return new Response(
        JSON.stringify({ 
          data: null,
          error: "Missing required fields: address, city, zipCode",
          attemptedSource: "none"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use RentCast for all property lookups
    const result = await rentcastLookup(address, city, state || "TX", zipCode);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Property lookup error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        data: null,
        error: `Internal server error: ${errorMsg}`,
        attemptedSource: "none" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
