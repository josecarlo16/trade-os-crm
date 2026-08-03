-- Tighten anon update policy on equipment_scans:
-- Mirror USING (email IS NULL) with a WITH CHECK that forces the update to actually
-- claim the scan by setting a non-empty email. Prevents anonymous tampering on
-- unclaimed rows (e.g., overwriting customer_name/phone without claiming) and
-- prevents un-claiming a row by setting email back to NULL.
DROP POLICY IF EXISTS "Anon can update unclaimed equipment scans" ON public.equipment_scans;

CREATE POLICY "Anon can claim unclaimed equipment scans"
ON public.equipment_scans
FOR UPDATE
TO anon
USING (email IS NULL)
WITH CHECK (
  email IS NOT NULL
  AND length(btrim(email)) > 0
  AND position('@' in email) > 1
);