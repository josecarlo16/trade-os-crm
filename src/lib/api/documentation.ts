import { supabase } from '@/integrations/supabase/client';

export interface DocumentResult {
  id?: string;
  brand: string;
  model_number?: string;
  model_pattern: string;
  document_type: string;
  document_title: string | null;
  document_url: string;
  source_domain?: string | null;
  file_type?: string | null;
  last_verified?: string;
  verified_working?: boolean;
}

export interface DocumentationSearchResponse {
  success: boolean;
  cache_hit?: boolean;
  documents?: DocumentResult[];
  error?: string;
}

export const documentationApi = {
  async searchDocumentation(brand: string, modelNumber: string): Promise<DocumentationSearchResponse> {
    const { data, error } = await supabase.functions.invoke('search-documentation', {
      body: { brand, model_number: modelNumber },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  async getDocumentsForEquipment(brand: string, modelNumber: string): Promise<DocumentResult[]> {
    const { data, error } = await supabase
      .from('equipment_documentation')
      .select('*')
      .ilike('brand', brand)
      .eq('model_number', modelNumber)
      .eq('verified_working', true);

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }

    return data || [];
  },
};

// Brand support URLs for fallback
export const BRAND_SUPPORT_URLS: Record<string, string> = {
  carrier: 'https://www.carrier.com/residential/en/us/support/',
  trane: 'https://www.trane.com/residential/en/support/',
  lennox: 'https://www.lennox.com/support',
  goodman: 'https://www.goodmanmfg.com/resources',
  rheem: 'https://www.rheem.com/support/',
  mitsubishi: 'https://www.mitsubishicomfort.com/support',
  daikin: 'https://www.daikincomfort.com/support',
  york: 'https://www.york.com/residential-equipment/support',
  amana: 'https://www.amana-hac.com/resources',
  bryant: 'https://www.bryant.com/en/us/support/',
};

export function getBrandSupportUrl(brand: string): string {
  const normalizedBrand = brand.toLowerCase();
  return BRAND_SUPPORT_URLS[normalizedBrand] || `https://www.google.com/search?q=${encodeURIComponent(brand)}+hvac+support`;
}
