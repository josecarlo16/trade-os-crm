-- contact_submissions, ducted_estimate_submissions, and ductless_estimate_submissions
-- were never migrated into the new multi-tenant schema at all (0 rows), and never had
-- tenant_id added — same class of gap as the marketing/SEO tables fixed earlier today.
-- Discovered while investigating why the admin Dashboard's Revenue Summary and Pipeline
-- Status showed $0 despite the live site having real submission data.

DO $migration$
DECLARE
  default_tenant_id UUID := 'cb75a3f3-f310-4587-a4cc-098f50aef59c';
  tbl TEXT;
  pol RECORD;
  tenant_tables TEXT[] := ARRAY[
    'contact_submissions', 'ducted_estimate_submissions', 'ductless_estimate_submissions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id)', tbl);
      EXECUTE format('UPDATE public.%I SET tenant_id = $1 WHERE tenant_id IS NULL', tbl) USING default_tenant_id;
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', tbl);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT %L', tbl, default_tenant_id);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', tbl || '_tenant_id_idx', tbl);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL TO authenticated USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id())',
        tbl
      );
    ELSE
      RAISE NOTICE 'Skipping %: table does not exist in this checkout', tbl;
    END IF;
  END LOOP;
END $migration$;
