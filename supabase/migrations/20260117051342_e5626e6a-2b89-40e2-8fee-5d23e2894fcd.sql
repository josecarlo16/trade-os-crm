-- Tighten public insert policy for ductless_estimate_submissions (avoid WITH CHECK (true))
DROP POLICY IF EXISTS "Anyone can submit estimates" ON public.ductless_estimate_submissions;

CREATE POLICY "Public can submit ductless estimates (validated)"
ON public.ductless_estimate_submissions
FOR INSERT
WITH CHECK (
  -- basic anti-abuse validation
  length(customer_name) BETWEEN 1 AND 120
  AND customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND (customer_phone IS NULL OR length(customer_phone) BETWEEN 7 AND 30)
  AND zone_count BETWEEN 1 AND 12
  AND subtotal >= 0
  AND tax_amount >= 0
  AND rebates >= 0
  AND final_total >= 0
);
