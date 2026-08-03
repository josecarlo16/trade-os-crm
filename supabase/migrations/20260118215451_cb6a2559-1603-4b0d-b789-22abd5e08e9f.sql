-- Add thermostat_name column to ducted_equipment table
ALTER TABLE public.ducted_equipment
  ADD COLUMN thermostat_name text;