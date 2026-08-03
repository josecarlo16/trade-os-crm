ALTER TABLE public.ducted_estimate_submissions DROP CONSTRAINT IF EXISTS ducted_estimate_submissions_status_check;
ALTER TABLE public.ducted_estimate_submissions ADD CONSTRAINT ducted_estimate_submissions_status_check
  CHECK (status = ANY (ARRAY['new'::text,'partial'::text,'contacted'::text,'reviewed'::text,'scheduled'::text,'quoted'::text,'converted'::text,'closed'::text,'lost'::text,'junk'::text]));

ALTER TABLE public.ductless_estimate_submissions DROP CONSTRAINT IF EXISTS ductless_estimate_submissions_status_check;
ALTER TABLE public.ductless_estimate_submissions ADD CONSTRAINT ductless_estimate_submissions_status_check
  CHECK (status = ANY (ARRAY['new'::text,'partial'::text,'contacted'::text,'reviewed'::text,'scheduled'::text,'quoted'::text,'converted'::text,'closed'::text,'lost'::text,'junk'::text]));