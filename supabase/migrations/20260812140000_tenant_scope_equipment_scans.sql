-- equipment_scans was left out of the multi-tenancy migration entirely
-- (it was assumed to be part of the excluded public scanner tool), but the
-- DFW Watch List admin page reads from it directly and is being restored —
-- without a tenant boundary, every tenant would see the exact same shared
-- lead list. Scope the admin-facing view/update policies to the current
-- tenant. The anon insert/update policies (used by the public scanner form,
-- which isn't rebuilt in this fork yet) are left as-is for now — they're
-- not an active surface until that public tool is rebuilt, but will need
-- the same treatment then.
ALTER TABLE public.equipment_scans
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

UPDATE public.equipment_scans
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'truficient')
WHERE tenant_id IS NULL;

-- Postgres doesn't allow a subquery in a column DEFAULT, so this uses
-- Truficient's known tenant id directly (matches the 'truficient' slug
-- backfilled above). Fine for now since the public scanner form that would
-- insert here isn't rebuilt in this fork yet.
ALTER TABLE public.equipment_scans
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT 'cb75a3f3-f310-4587-a4cc-098f50aef59c';

DROP POLICY IF EXISTS "Admins can view equipment scans" ON public.equipment_scans;
CREATE POLICY "Admins can view their tenant's equipment scans"
  ON public.equipment_scans FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "Admins can update equipment scans" ON public.equipment_scans;
CREATE POLICY "Admins can update their tenant's equipment scans"
  ON public.equipment_scans FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin'::app_role, 'admin'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin'::app_role, 'admin'::app_role)
    )
  );
