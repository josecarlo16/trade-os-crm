-- First admin bootstrap: Allow inserting the first admin when no admins exist
-- This is a one-time bootstrap policy
CREATE POLICY "Bootstrap first admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
  AND role = 'admin'
);