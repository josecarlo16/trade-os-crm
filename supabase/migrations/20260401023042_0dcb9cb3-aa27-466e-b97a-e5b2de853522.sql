DROP POLICY "Authenticated users can view team members" ON public.crm_team_members;

CREATE POLICY "Admins and managers can view team members"
  ON public.crm_team_members FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );