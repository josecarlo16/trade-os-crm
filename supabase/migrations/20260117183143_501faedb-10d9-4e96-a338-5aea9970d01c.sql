-- Add voltage_info column to equipment_scans table
ALTER TABLE public.equipment_scans 
ADD COLUMN IF NOT EXISTS voltage_info TEXT;