
-- Drop the misconfigured public-role policy
DROP POLICY IF EXISTS "Authenticated users can view estimate versions" ON public.estimate_versions;

-- Drop the existing policy with same target name
DROP POLICY IF EXISTS "Admins and managers can view estimate versions" ON public.estimate_versions;

-- Recreate with proper role restriction
CREATE POLICY "Admins and managers can view estimate versions"
ON public.estimate_versions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);
