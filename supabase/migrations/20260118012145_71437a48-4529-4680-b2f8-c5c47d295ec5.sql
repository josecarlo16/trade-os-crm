-- Remove manufactured_year from all equipment_pages.specs JSONB
-- This data is scan-specific (varies per unit) and shouldn't be on model-level pages
UPDATE equipment_pages
SET specs = specs - 'manufactured_year'
WHERE specs ? 'manufactured_year';