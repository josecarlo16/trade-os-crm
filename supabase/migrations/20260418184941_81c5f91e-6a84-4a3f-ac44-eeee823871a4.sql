-- ============================================================================
-- PHASE 1 FOUNDATION: Equipment Library content pipeline
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. MERGE 2 KNOWN DUPLICATE TRANE PAIRS BEFORE SLUG REWRITE
--    (slash row is the "winner" — it has richer specs + cached docs)
-- ----------------------------------------------------------------------------

-- TTP042C100A4: keep d67f9516..., merge in mfg_year=1999 from 6fb32401...
UPDATE public.equipment_pages
SET
  specs = specs || jsonb_build_object('manufactured_year', 1999),
  times_searched = COALESCE(times_searched, 0) + 1,
  updated_at = now()
WHERE id = 'd67f9516-4f08-4cfa-8232-5d42b7d1edf8';

DELETE FROM public.equipment_pages
WHERE id = '6fb32401-f82a-4d7d-8504-bb50ee66aa5e';

-- TTX036D100AD: keep 0e86cc2a..., merge in mfg_year=2004 from 976e0e1d...
UPDATE public.equipment_pages
SET
  specs = specs || jsonb_build_object('manufactured_year', 2004),
  times_searched = COALESCE(times_searched, 0) + 1,
  updated_at = now()
WHERE id = '0e86cc2a-25cc-4839-ace2-d3d98dce8434';

DELETE FROM public.equipment_pages
WHERE id = '976e0e1d-07c1-45cb-baa9-d09d3719b09d';

-- ----------------------------------------------------------------------------
-- 1. EXTEND equipment_pages
-- ----------------------------------------------------------------------------

ALTER TABLE public.equipment_pages
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS market_segment TEXT NOT NULL DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS type_descriptor TEXT,
  ADD COLUMN IF NOT EXISTS stages TEXT,
  ADD COLUMN IF NOT EXISTS seer2_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS hspf_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS refrigerant TEXT,
  ADD COLUMN IF NOT EXISTS tonnage NUMERIC,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS key_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ideal_for JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS manufacturer_spec_url TEXT,
  ADD COLUMN IF NOT EXISTS intro_year INTEGER,
  ADD COLUMN IF NOT EXISTS is_discontinued BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discontinuation_date DATE,
  ADD COLUMN IF NOT EXISTS successor_equipment_page_id UUID REFERENCES public.equipment_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS install_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_installed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cities_installed JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_equipment_pages_tier ON public.equipment_pages(tier);
CREATE INDEX IF NOT EXISTS idx_equipment_pages_market_segment ON public.equipment_pages(market_segment);
CREATE INDEX IF NOT EXISTS idx_equipment_pages_install_count ON public.equipment_pages(install_count DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_pages_last_installed ON public.equipment_pages(last_installed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_equipment_pages_brand_model ON public.equipment_pages(brand, model_number);

-- ----------------------------------------------------------------------------
-- 2. SLUG SLASH → HYPHEN MIGRATION
-- ----------------------------------------------------------------------------

UPDATE public.equipment_pages
SET slug = REGEXP_REPLACE(slug, '/', '-', 'g'),
    updated_at = now()
WHERE slug LIKE '%/%';

-- ----------------------------------------------------------------------------
-- 3. job_equipment_installs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.job_equipment_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.crm_jobs(id) ON DELETE CASCADE,
  equipment_page_id UUID NOT NULL REFERENCES public.equipment_pages(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  serial_numbers TEXT[],
  install_date DATE,
  install_notes TEXT,
  warranty_expiry DATE,
  source TEXT NOT NULL,
  source_confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_equipment_unique UNIQUE (job_id, equipment_page_id)
);

CREATE INDEX IF NOT EXISTS idx_job_equipment_installs_job ON public.job_equipment_installs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_equipment_installs_equipment ON public.job_equipment_installs(equipment_page_id);

ALTER TABLE public.job_equipment_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view job equipment installs"
  ON public.job_equipment_installs FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins and managers can manage job equipment installs"
  ON public.job_equipment_installs FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'super_admin'));

-- ----------------------------------------------------------------------------
-- 4. service_area_pages
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.service_area_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_type TEXT NOT NULL,
  area_name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'TX',
  slug TEXT UNIQUE NOT NULL,
  headline TEXT,
  description TEXT,
  service_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  local_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  install_count INTEGER NOT NULL DEFAULT 0,
  last_install_at TIMESTAMPTZ,
  popular_equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_area_pages_slug ON public.service_area_pages(slug);
CREATE INDEX IF NOT EXISTS idx_service_area_pages_type ON public.service_area_pages(area_type);
CREATE INDEX IF NOT EXISTS idx_service_area_pages_published ON public.service_area_pages(published) WHERE published = true;

ALTER TABLE public.service_area_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published service area pages"
  ON public.service_area_pages FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can view all service area pages"
  ON public.service_area_pages FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage service area pages"
  ON public.service_area_pages FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_service_area_pages_updated_at
  BEFORE UPDATE ON public.service_area_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. content_cross_links
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.content_cross_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type TEXT NOT NULL,
  from_id UUID NOT NULL,
  to_type TEXT NOT NULL,
  to_id UUID NOT NULL,
  link_reason TEXT NOT NULL,
  relevance_score NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cross_link_unique UNIQUE (from_type, from_id, to_type, to_id, link_reason)
);

CREATE INDEX IF NOT EXISTS idx_cross_links_from ON public.content_cross_links(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_cross_links_to ON public.content_cross_links(to_type, to_id);

ALTER TABLE public.content_cross_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view cross links"
  ON public.content_cross_links FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage cross links"
  ON public.content_cross_links FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ----------------------------------------------------------------------------
-- 6. equipment_page_conflicts
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.equipment_page_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_page_id UUID NOT NULL REFERENCES public.equipment_pages(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  existing_value TEXT,
  incoming_value TEXT,
  existing_confidence NUMERIC,
  incoming_confidence NUMERIC,
  source TEXT NOT NULL,
  resolution TEXT NOT NULL,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_page_conflicts_page ON public.equipment_page_conflicts(equipment_page_id);
CREATE INDEX IF NOT EXISTS idx_equipment_page_conflicts_resolution ON public.equipment_page_conflicts(resolution);

ALTER TABLE public.equipment_page_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view equipment page conflicts"
  ON public.equipment_page_conflicts FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage equipment page conflicts"
  ON public.equipment_page_conflicts FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ----------------------------------------------------------------------------
-- 7. EXTEND workedge_project_media
-- ----------------------------------------------------------------------------

ALTER TABLE public.workedge_project_media
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS classification_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS classification_metadata JSONB,
  ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extracted_brand TEXT,
  ADD COLUMN IF NOT EXISTS extracted_model TEXT,
  ADD COLUMN IF NOT EXISTS extracted_serial TEXT,
  ADD COLUMN IF NOT EXISTS extracted_tonnage NUMERIC,
  ADD COLUMN IF NOT EXISTS extracted_refrigerant TEXT,
  ADD COLUMN IF NOT EXISTS extracted_mfg_date DATE,
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS equipment_page_id UUID REFERENCES public.equipment_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_workedge_media_content_type ON public.workedge_project_media(content_type);
CREATE INDEX IF NOT EXISTS idx_workedge_media_equipment_page ON public.workedge_project_media(equipment_page_id);
CREATE INDEX IF NOT EXISTS idx_workedge_media_review_status ON public.workedge_project_media(review_status);