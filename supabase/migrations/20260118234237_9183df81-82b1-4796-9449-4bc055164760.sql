-- Drop the overly permissive UPDATE policy that allows anyone to update any field
DROP POLICY IF EXISTS "Anyone can update equipment page search count" ON public.equipment_pages;

-- Create a proper admin/manager-only UPDATE policy
-- Edge functions use service role key which bypasses RLS, so they will still work
CREATE POLICY "Admins and managers can update equipment pages"
ON public.equipment_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  )
);