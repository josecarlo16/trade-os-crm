-- SEO admin page (page_seo, GSC metrics/snapshots, linking opportunities,
-- location pages) reads/writes several tables that were left out of the
-- multi-tenancy migration entirely, same class of gap as the marketing
-- tables fixed in 20260813150000. Confirmed live: a tenant-b test login
-- could see all 69 of the default tenant's SEO pages before this ran.

DO $migration$
DECLARE
  default_tenant_id UUID := 'cb75a3f3-f310-4587-a4cc-098f50aef59c';
  tbl TEXT;
  pol RECORD;
  tenant_tables TEXT[] := ARRAY[
    'page_seo', 'page_seo_gsc_snapshots', 'gsc_site_metrics',
    'gsc_page_metrics', 'gsc_query_metrics', 'seo_linking_opportunities',
    'seo_location_pages'
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
