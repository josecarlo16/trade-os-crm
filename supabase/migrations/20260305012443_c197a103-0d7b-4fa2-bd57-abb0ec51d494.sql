
-- Drop the public SELECT policy that exposes all columns including PII
DROP POLICY IF EXISTS "Anyone can view equipment scans" ON equipment_scans;

-- Create admin/manager-only SELECT policy for full access
CREATE POLICY "Admins can view equipment scans"
  ON equipment_scans FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
  );

-- Create a safe public view that excludes PII (customer_name, email, customer_phone, customer_address, serial_number, ghl_contact_id)
CREATE OR REPLACE VIEW public.equipment_scans_public AS
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
FROM public.equipment_scans;

-- Grant anonymous and authenticated users access to the safe view
GRANT SELECT ON public.equipment_scans_public TO anon;
GRANT SELECT ON public.equipment_scans_public TO authenticated;
