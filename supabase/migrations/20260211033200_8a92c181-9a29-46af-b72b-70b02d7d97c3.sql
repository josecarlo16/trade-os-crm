-- Drop and recreate the UPDATE policy with a WITH CHECK clause
-- so soft-deletes (setting deleted_at) are allowed
DROP POLICY "Admins and managers can update jobs" ON public.crm_jobs;

CREATE POLICY "Admins and managers can update jobs"
ON public.crm_jobs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  )
);