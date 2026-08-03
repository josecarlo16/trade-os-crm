-- Update the status check constraint to include 'partial' for abandoned cart tracking
-- and 'junk' for spam/invalid submissions

ALTER TABLE ducted_estimate_submissions 
  DROP CONSTRAINT ducted_estimate_submissions_status_check;

ALTER TABLE ducted_estimate_submissions 
  ADD CONSTRAINT ducted_estimate_submissions_status_check 
  CHECK (status = ANY (ARRAY['new', 'partial', 'contacted', 'scheduled', 'quoted', 'converted', 'lost', 'junk']));