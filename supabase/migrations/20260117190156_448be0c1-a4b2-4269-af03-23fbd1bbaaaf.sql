-- Add customer contact info and marketing opt-in columns to equipment_scans
ALTER TABLE public.equipment_scans 
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS customer_address text,
ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT true;