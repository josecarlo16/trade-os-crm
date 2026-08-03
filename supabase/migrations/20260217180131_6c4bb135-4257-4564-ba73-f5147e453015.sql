
-- Remove the old UPDATE policy that uses direct subquery (causes RLS recursion)
DROP POLICY IF EXISTS "Admins and managers can update customers" ON public.crm_customers;
