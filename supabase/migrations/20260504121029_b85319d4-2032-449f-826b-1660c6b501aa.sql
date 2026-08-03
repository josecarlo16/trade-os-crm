-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view project media" ON public.workedge_project_media;

-- Create a restricted SELECT policy limited to admin/super_admin/manager roles
CREATE POLICY "Admins and managers can view project media"
ON public.workedge_project_media
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);