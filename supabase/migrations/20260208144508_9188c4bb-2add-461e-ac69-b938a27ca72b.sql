-- Add property data tracking columns to crm_locations
ALTER TABLE public.crm_locations 
ADD COLUMN IF NOT EXISTS property_data_source TEXT,
ADD COLUMN IF NOT EXISTS property_data_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS property_data_auto_populated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lot_size_sqft INTEGER,
ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS property_class TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.crm_locations.property_data_source IS 'Source of property data: dallas_cad, tarrant_cad, collin_cad, denton_cad, attom, manual';
COMMENT ON COLUMN public.crm_locations.property_data_verified_at IS 'When property data was last fetched/verified';
COMMENT ON COLUMN public.crm_locations.property_data_auto_populated IS 'Whether property data was auto-populated from external source';
COMMENT ON COLUMN public.crm_locations.property_class IS 'Property classification from CAD: residential, commercial, etc';