-- Add heating source field to distinguish gas vs heat pump systems
ALTER TABLE public.equipment_systems
ADD COLUMN heating_source TEXT CHECK (heating_source IN ('gas_furnace', 'heat_pump'));

-- Add furnace-specific columns (for gas systems)
ALTER TABLE public.equipment_systems
ADD COLUMN furnace_model TEXT,
ADD COLUMN furnace_price NUMERIC,
ADD COLUMN furnace_btu_input INTEGER,
ADD COLUMN furnace_afue NUMERIC;

-- Add air handler-specific columns (for heat pump systems)
ALTER TABLE public.equipment_systems
ADD COLUMN air_handler_model TEXT,
ADD COLUMN air_handler_price NUMERIC,
ADD COLUMN air_handler_cfm INTEGER;

-- Add migration tracking flag for existing records
ALTER TABLE public.equipment_systems
ADD COLUMN needs_migration_review BOOLEAN DEFAULT true;

-- Set needs_migration_review to false for new records going forward
-- (existing records will have true by default for review)