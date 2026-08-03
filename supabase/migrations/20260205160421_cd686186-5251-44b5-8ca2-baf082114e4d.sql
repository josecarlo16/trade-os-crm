-- Add 'partial', 'quoted', and 'junk' to ductless_estimate_submissions status constraint
-- This matches the ducted table and allows abandoned cart saves with status='partial'

ALTER TABLE ductless_estimate_submissions 
DROP CONSTRAINT IF EXISTS ductless_estimate_submissions_status_check;

ALTER TABLE ductless_estimate_submissions 
ADD CONSTRAINT ductless_estimate_submissions_status_check 
CHECK (status = ANY (ARRAY['new', 'partial', 'contacted', 'scheduled', 'quoted', 'converted', 'closed', 'junk']::text[]));