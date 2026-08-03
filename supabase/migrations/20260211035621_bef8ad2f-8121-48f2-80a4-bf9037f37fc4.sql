
-- Drop and recreate the SELECT policy to allow the soft-delete update to work
-- The issue: UPDATE checks WITH CHECK against SELECT visibility, 
-- so setting deleted_at makes the row "disappear" mid-update

DROP POLICY IF EXISTS "Authenticated users can view jobs" ON public.crm_jobs;

CREATE POLICY "Authenticated users can view jobs"
ON public.crm_jobs
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);
