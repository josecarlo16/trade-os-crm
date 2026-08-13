-- crm_job_appointments and ghl_tags were never scoped by the multi-tenancy
-- migration at all (missed entirely, not even flagged as intentionally
-- excluded) — discovered while migrating real data when inserts failed with
-- "tenant_id column not found". Both need the same treatment as every other
-- CRM table.
ALTER TABLE public.crm_job_appointments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.crm_job_appointments SET tenant_id = 'cb75a3f3-f310-4587-a4cc-098f50aef59c' WHERE tenant_id IS NULL;
ALTER TABLE public.crm_job_appointments
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT 'cb75a3f3-f310-4587-a4cc-098f50aef59c';

DROP POLICY IF EXISTS "Authenticated users can manage job appointments" ON public.crm_job_appointments;
CREATE POLICY "Authenticated users can manage their tenant's job appointments"
  ON public.crm_job_appointments FOR ALL
  TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

ALTER TABLE public.ghl_tags ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.ghl_tags SET tenant_id = 'cb75a3f3-f310-4587-a4cc-098f50aef59c' WHERE tenant_id IS NULL;
ALTER TABLE public.ghl_tags
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT 'cb75a3f3-f310-4587-a4cc-098f50aef59c';
