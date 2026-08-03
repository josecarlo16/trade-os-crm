-- Add factory_charge column to equipment_scans table
ALTER TABLE public.equipment_scans 
ADD COLUMN IF NOT EXISTS factory_charge TEXT;