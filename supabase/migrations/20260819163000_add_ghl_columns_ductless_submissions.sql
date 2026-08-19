-- ductless_estimate_submissions was missing ghl_contact_id/ghl_sync_status
-- columns that exist on the live site's schema, discovered while migrating
-- the live submission rows over (PGRST204 "column not found" errors).
ALTER TABLE public.ductless_estimate_submissions
  ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS ghl_sync_status TEXT;
