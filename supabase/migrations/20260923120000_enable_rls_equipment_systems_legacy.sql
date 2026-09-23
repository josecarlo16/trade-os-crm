-- equipment_systems_legacy was created directly via psql during the initial
-- Lovable data migration (not through a tracked migration), so it never got
-- RLS enabled — flagged by Supabase's security advisor as publicly
-- readable/writable. Lock it down the same way equipment_systems itself is
-- scoped: admin-only, tenant-isolated.

ALTER TABLE public.equipment_systems_legacy ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.equipment_systems_legacy SET tenant_id = 'cb75a3f3-f310-4587-a4cc-098f50aef59c' WHERE tenant_id IS NULL;
ALTER TABLE public.equipment_systems_legacy
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.get_current_tenant_id();

ALTER TABLE public.equipment_systems_legacy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their tenant's legacy equipment systems"
  ON public.equipment_systems_legacy FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(), 'admin'));
