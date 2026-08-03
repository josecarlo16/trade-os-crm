-- Add GHL tracking columns to equipment_scans
ALTER TABLE public.equipment_scans 
ADD COLUMN ghl_contact_id text,
ADD COLUMN ghl_sync_status varchar(20) NOT NULL DEFAULT 'pending';

-- Update existing records with email as 'unknown' status (may have synced before tracking)
UPDATE public.equipment_scans 
SET ghl_sync_status = 'unknown' 
WHERE email IS NOT NULL;

-- Records without email should be 'not_applicable'
UPDATE public.equipment_scans 
SET ghl_sync_status = 'not_applicable' 
WHERE email IS NULL;