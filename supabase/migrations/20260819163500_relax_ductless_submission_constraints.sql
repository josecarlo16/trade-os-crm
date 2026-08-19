-- ductless_estimate_submissions had customer_name/customer_email as NOT NULL,
-- but the live site allows both to be null for partial/abandoned-cart
-- submissions (a lead that started the estimator wizard but never entered
-- contact info). Discovered migrating real data — the constraint was
-- stricter here than on the live schema it was copied from.
ALTER TABLE public.ductless_estimate_submissions
  ALTER COLUMN customer_name DROP NOT NULL,
  ALTER COLUMN customer_email DROP NOT NULL;
