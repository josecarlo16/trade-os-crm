
-- Fix UPDATE policy to use SECURITY DEFINER function and allow soft-delete
DROP POLICY IF EXISTS "Admins and managers can update jobs" ON public.crm_jobs;

CREATE POLICY "Admins and managers can update jobs"
  ON public.crm_jobs
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Also fix INSERT policy to use SECURITY DEFINER function
DROP POLICY IF EXISTS "Admins and managers can insert jobs" ON public.crm_jobs;

CREATE POLICY "Admins and managers can insert jobs"
  ON public.crm_jobs
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Also fix DELETE policy to use SECURITY DEFINER function
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.crm_jobs;

CREATE POLICY "Admins can delete jobs"
  ON public.crm_jobs
  FOR DELETE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
