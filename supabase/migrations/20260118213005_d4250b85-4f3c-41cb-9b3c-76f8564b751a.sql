-- Add new columns for systems-based pricing
ALTER TABLE ducted_equipment
  ADD COLUMN IF NOT EXISTS system_name text,
  ADD COLUMN IF NOT EXISTS condenser_model text,
  ADD COLUMN IF NOT EXISTS furnace_model text,
  ADD COLUMN IF NOT EXISTS evap_coil_model text,
  ADD COLUMN IF NOT EXISTS heat_pump_model text,
  ADD COLUMN IF NOT EXISTS air_handler_model text,
  ADD COLUMN IF NOT EXISTS heat_kit_model text,
  ADD COLUMN IF NOT EXISTS seer2_rating numeric,
  ADD COLUMN IF NOT EXISTS eer2_rating numeric,
  ADD COLUMN IF NOT EXISTS hspf2_rating numeric;

-- Migrate existing data to new columns
UPDATE ducted_equipment
SET 
  system_name = COALESCE(system_name, brand || ' ' || tonnage || '-Ton ' || 
    CASE 
      WHEN system_type = 'gas_system' THEN 'Gas System'
      WHEN system_type = 'heat_pump' THEN 'Heat Pump'
      ELSE 'System'
    END),
  seer2_rating = COALESCE(seer2_rating, seer_rating),
  hspf2_rating = COALESCE(hspf2_rating, hspf_rating),
  condenser_model = CASE WHEN system_type = 'gas_system' AND condenser_model IS NULL THEN model_number ELSE condenser_model END,
  heat_pump_model = CASE WHEN system_type = 'heat_pump' AND heat_pump_model IS NULL THEN model_number ELSE heat_pump_model END
WHERE system_name IS NULL OR seer2_rating IS NULL;

-- Drop old columns (model_number, seer_rating, hspf_rating, afue_rating)
ALTER TABLE ducted_equipment
  DROP COLUMN IF EXISTS model_number,
  DROP COLUMN IF EXISTS seer_rating,
  DROP COLUMN IF EXISTS hspf_rating,
  DROP COLUMN IF EXISTS afue_rating;