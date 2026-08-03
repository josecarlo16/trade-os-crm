-- Add address component columns to ductless_estimate_submissions
ALTER TABLE ductless_estimate_submissions
ADD COLUMN customer_city text,
ADD COLUMN customer_county text,
ADD COLUMN customer_state text,
ADD COLUMN customer_zip text,
ADD COLUMN google_place_id text;