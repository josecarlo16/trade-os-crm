
-- Drop and recreate the UPDATE policy to allow soft-delete (setting deleted_at)
DROP POLICY IF EXISTS "Admins can update customers" ON public.crm_customers;

CREATE POLICY "Admins can update customers"
ON public.crm_customers
FOR UPDATE
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
)
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
);
