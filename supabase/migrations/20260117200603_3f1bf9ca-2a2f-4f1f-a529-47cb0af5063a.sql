-- Add city and state columns to equipment_scans for validated location data
ALTER TABLE public.equipment_scans 
ADD COLUMN city varchar(100),
ADD COLUMN state varchar(50);