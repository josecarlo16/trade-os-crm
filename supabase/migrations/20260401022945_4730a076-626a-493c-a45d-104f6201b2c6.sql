-- Fix: Restrict anonymous UPDATE on equipment_scans to only unclaimed rows (no email yet)
DROP POLICY "Anyone can update equipment scans by id" ON public.equipment_scans;

CREATE POLICY "Anon can update unclaimed equipment scans"
  ON public.equipment_scans FOR UPDATE
  TO anon
  USING (email IS NULL)
  WITH CHECK (true);

CREATE POLICY "Authenticated can update equipment scans"
  ON public.equipment_scans FOR UPDATE
  TO authenticated
  USING (
    email IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
    )
  )
  WITH CHECK (true);

-- Fix: Restrict anonymous UPDATE on ducted_estimate_submissions to only partial rows
DROP POLICY "Public can update partial ducted submissions" ON public.ducted_estimate_submissions;

CREATE POLICY "Anon can update partial ducted submissions"
  ON public.ducted_estimate_submissions FOR UPDATE
  TO anon
  USING (status = 'partial')
  WITH CHECK (status = 'partial');