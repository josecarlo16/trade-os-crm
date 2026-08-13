-- admin_costs and the ductless-estimator pricing catalog tables were left
-- out of the multi-tenancy migration (same class of gap as equipment_scans
-- and role_permissions before them) — restoring the Admin Costs and
-- Ductless Config admin pages means every tenant would otherwise share and
-- be able to edit the exact same pricing catalog. ductless_estimate_submissions
-- is intentionally left alone here — it belongs to the public-facing quiz
-- tool, which isn't rebuilt in this fork yet.

-- admin_costs
ALTER TABLE public.admin_costs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.admin_costs SET tenant_id = 'cb75a3f3-f310-4587-a4cc-098f50aef59c' WHERE tenant_id IS NULL;
ALTER TABLE public.admin_costs
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT 'cb75a3f3-f310-4587-a4cc-098f50aef59c';

DROP POLICY IF EXISTS "Admins can manage admin costs" ON public.admin_costs;
CREATE POLICY "Admins can manage their tenant's admin costs"
  ON public.admin_costs FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view admin costs" ON public.admin_costs;
CREATE POLICY "Authenticated users can view their tenant's admin costs"
  ON public.admin_costs FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

-- ductless_unit_types
ALTER TABLE public.ductless_unit_types ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.ductless_unit_types SET tenant_id = 'cb75a3f3-f310-4587-a4cc-098f50aef59c' WHERE tenant_id IS NULL;
ALTER TABLE public.ductless_unit_types
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT 'cb75a3f3-f310-4587-a4cc-098f50aef59c';

DROP POLICY IF EXISTS "Public can view active unit types" ON public.ductless_unit_types;
CREATE POLICY "Public can view active unit types in their tenant"
  ON public.ductless_unit_types FOR SELECT
  USING (is_active = true AND tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Admins can manage unit types" ON public.ductless_unit_types;
CREATE POLICY "Admins can manage their tenant's unit types"
  ON public.ductless_unit_types FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- ductless_system_tiers
ALTER TABLE public.ductless_system_tiers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.ductless_system_tiers SET tenant_id = 'cb75a3f3-f310-4587-a4cc-098f50aef59c' WHERE tenant_id IS NULL;
ALTER TABLE public.ductless_system_tiers
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT 'cb75a3f3-f310-4587-a4cc-098f50aef59c';

DROP POLICY IF EXISTS "Public can view active system tiers" ON public.ductless_system_tiers;
CREATE POLICY "Public can view active system tiers in their tenant"
  ON public.ductless_system_tiers FOR SELECT
  USING (is_active = true AND tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Admins can manage system tiers" ON public.ductless_system_tiers;
CREATE POLICY "Admins can manage their tenant's system tiers"
  ON public.ductless_system_tiers FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- ductless_addons
ALTER TABLE public.ductless_addons ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.ductless_addons SET tenant_id = 'cb75a3f3-f310-4587-a4cc-098f50aef59c' WHERE tenant_id IS NULL;
ALTER TABLE public.ductless_addons
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT 'cb75a3f3-f310-4587-a4cc-098f50aef59c';

DROP POLICY IF EXISTS "Public can view active addons" ON public.ductless_addons;
CREATE POLICY "Public can view active addons in their tenant"
  ON public.ductless_addons FOR SELECT
  USING (is_active = true AND tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Admins can manage addons" ON public.ductless_addons;
CREATE POLICY "Admins can manage their tenant's addons"
  ON public.ductless_addons FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- ductless_unit_size_pricing (backfill tenant_id from its parent unit type)
ALTER TABLE public.ductless_unit_size_pricing ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.ductless_unit_size_pricing p
SET tenant_id = ut.tenant_id
FROM public.ductless_unit_types ut
WHERE p.unit_type_id = ut.id AND p.tenant_id IS NULL;
ALTER TABLE public.ductless_unit_size_pricing
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT 'cb75a3f3-f310-4587-a4cc-098f50aef59c';

DROP POLICY IF EXISTS "Admins can manage size pricing" ON public.ductless_unit_size_pricing;
CREATE POLICY "Admins can manage their tenant's size pricing"
  ON public.ductless_unit_size_pricing FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Managers can view size pricing" ON public.ductless_unit_size_pricing;
CREATE POLICY "Managers can view their tenant's size pricing"
  ON public.ductless_unit_size_pricing FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "Public can view available sizes" ON public.ductless_unit_size_pricing;
CREATE POLICY "Public can view available sizes in their tenant"
  ON public.ductless_unit_size_pricing FOR SELECT
  USING (is_available = true AND tenant_id = public.get_current_tenant_id());
