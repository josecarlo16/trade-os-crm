
-- Recreate the equipment_scans_public view with security_invoker = true
-- This ensures RLS policies of the querying user are enforced, not the view owner
CREATE OR REPLACE VIEW public.equipment_scans_public
WITH (security_invoker = true)
AS
SELECT
  id,
  zip_code,
  brand,
  model_number,
  manufactured_year,
  tonnage,
  refrigerant,
  breaker_size,
  seer_rating,
  equipment_type,
  fan_motor_info,
  compressor_info,
  factory_charge,
  voltage_info,
  is_dfw,
  created_at,
  city,
  state
FROM equipment_scans;
