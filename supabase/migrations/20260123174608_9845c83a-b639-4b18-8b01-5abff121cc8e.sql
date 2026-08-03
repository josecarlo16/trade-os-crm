-- Make customer_phone nullable to match frontend behavior
-- Users can optionally provide phone number
ALTER TABLE public.ducted_estimate_submissions
ALTER COLUMN customer_phone DROP NOT NULL;