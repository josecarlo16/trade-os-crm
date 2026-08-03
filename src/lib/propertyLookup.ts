import { supabase } from "@/integrations/supabase/client";

export interface PropertyLookupRequest {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  county?: string;
}

export interface PropertyData {
  squareFootage: number | null;
  yearBuilt: number | null;
  stories: number | null;
  lotSizeSqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyClass: string | null;
  source: string;
}

export interface PropertyLookupResult {
  data: PropertyData | null;
  error: string | null;
  attemptedSource: string | null;
}

export async function lookupPropertyData(
  request: PropertyLookupRequest
): Promise<PropertyLookupResult> {
  try {
    const { data, error } = await supabase.functions.invoke("lookup-property-data", {
      body: request,
    });

    if (error) {
      console.error("Property lookup error:", error);
      return {
        data: null,
        error: error.message || "Failed to connect to property lookup service",
        attemptedSource: null,
      };
    }

    // The backend now returns { data, error, attemptedSource }
    if (data?.data) {
      return {
        data: data.data as PropertyData,
        error: null,
        attemptedSource: data.data.source || data.attemptedSource,
      };
    }

    // No data found - return the error from backend
    return {
      data: null,
      error: data?.error || "No property data found for this address",
      attemptedSource: data?.attemptedSource || null,
    };
  } catch (err) {
    console.error("Property lookup failed:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Property lookup failed",
      attemptedSource: null,
    };
  }
}

// Format source name for display
export function formatPropertySource(source: string): string {
  const sourceMap: Record<string, string> = {
    rentcast: "RentCast",
    dallas_cad: "Dallas CAD",
    tarrant_cad: "Tarrant CAD",
    collin_cad: "Collin CAD",
    denton_cad: "Denton CAD",
    attom: "Attom Data",
    manual: "Manual Entry",
    not_found: "Not Found",
    none: "No Lookup Available",
    unknown: "Unknown",
  };
  return sourceMap[source] || source;
}
