-- Add GHL sync columns to ducted_estimate_submissions table
ALTER TABLE public.ducted_estimate_submissions 
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ghl_sync_status TEXT DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.ducted_estimate_submissions.ghl_contact_id IS 'GoHighLevel contact ID after sync';
COMMENT ON COLUMN public.ducted_estimate_submissions.ghl_sync_status IS 'GHL sync status: pending, synced, failed';