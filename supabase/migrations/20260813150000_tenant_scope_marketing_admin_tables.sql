-- Blog, Gallery, SEO, Calculators, Landing Pages, Scanner/Button/Social
-- analytics were left out of the multi-tenancy migration entirely (same
-- class of gap as equipment_scans, admin_costs, and the ductless tables
-- before them) — restoring their admin pages means every tenant would
-- otherwise share and be able to edit the exact same marketing content.
-- button_clicks never had a migration-tracked CREATE TABLE in the source
-- codebase (it was created ad-hoc), so it's created here tenant-scoped
-- from the start rather than retrofitted.

DO $migration$
DECLARE
  default_tenant_id UUID := 'cb75a3f3-f310-4587-a4cc-098f50aef59c';
  tbl TEXT;
  pol RECORD;
  tenant_tables TEXT[] := ARRAY[
    'blog_posts',
    'gallery_images', 'gallery_tags', 'gallery_image_tags',
    'calculator_configs', 'calculator_options',
    'campaign_landing_pages', 'landing_page_forms',
    'landing_page_form_tags', 'landing_page_submissions',
    'tracking_settings', 'social_links', 'social_link_clicks'
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

-- button_clicks: new table, tenant-scoped from creation
CREATE TABLE IF NOT EXISTS public.button_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT 'cb75a3f3-f310-4587-a4cc-098f50aef59c' REFERENCES public.tenants(id),
  button_name TEXT NOT NULL,
  button_location TEXT NOT NULL,
  destination_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS button_clicks_tenant_id_idx ON public.button_clicks (tenant_id);

ALTER TABLE public.button_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.button_clicks
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- No anon insert policy: the public tracking widget that logs clicks
-- unauthenticated isn't being rebuilt in this pass (admin-only for now).

-- blog_images storage bucket (public read, authenticated write within tenant folder)
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog_images', 'blog_images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Blog images are publicly accessible" ON storage.objects;
CREATE POLICY "Blog images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog_images');

DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
CREATE POLICY "Authenticated users can upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog_images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update blog images" ON storage.objects;
CREATE POLICY "Authenticated users can update blog images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'blog_images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete blog images" ON storage.objects;
CREATE POLICY "Authenticated users can delete blog images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'blog_images' AND auth.role() = 'authenticated');
