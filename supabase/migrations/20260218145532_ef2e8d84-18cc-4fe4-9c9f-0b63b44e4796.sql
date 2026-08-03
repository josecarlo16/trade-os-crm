
-- Fix SELECT policy: admins see all rows, others only non-deleted
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.crm_customers;

CREATE POLICY "Authenticated users can view customers"
ON public.crm_customers
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  OR get_user_role(auth.uid()) IN ('super_admin', 'admin')
);
