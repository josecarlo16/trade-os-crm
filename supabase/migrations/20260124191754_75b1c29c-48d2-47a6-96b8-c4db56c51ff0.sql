-- Add refrigerant type column
ALTER TABLE public.equipment_systems
ADD COLUMN refrigerant TEXT CHECK (refrigerant IN ('R-32', 'R-454b'));

-- Add thermostat columns
ALTER TABLE public.equipment_systems
ADD COLUMN thermostat_model TEXT,
ADD COLUMN thermostat_price NUMERIC;

-- Add comment for documentation
COMMENT ON COLUMN public.equipment_systems.refrigerant IS 'Refrigerant type: R-32 or R-454b';
COMMENT ON COLUMN public.equipment_systems.thermostat_model IS 'Thermostat model number included with system';
COMMENT ON COLUMN public.equipment_systems.thermostat_price IS 'Thermostat equipment cost';