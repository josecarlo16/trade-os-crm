-- equipment_systems (and its legacy counterpart) were scoped to admins with
-- has_role(auth.uid(), 'admin') only, which excludes super_admin accounts —
-- every other admin-gated table in this schema (approval_rules, storage
-- buckets, conversations, etc.) checks both roles. This blocked super_admin
-- users from inserting/updating systems at all (RLS 42501), surfaced by the
-- price-sheet importer's batch insert.

DROP POLICY IF EXISTS "Admins can manage their tenant's equipment systems" ON public.equipment_systems;

CREATE POLICY "Admins can manage their tenant's equipment systems"
  ON public.equipment_systems FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "Admins can manage their tenant's legacy equipment systems" ON public.equipment_systems_legacy;

CREATE POLICY "Admins can manage their tenant's legacy equipment systems"
  ON public.equipment_systems_legacy FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
