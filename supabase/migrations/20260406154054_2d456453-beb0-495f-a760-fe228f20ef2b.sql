-- Part 1: Add new tracking columns to page_seo
ALTER TABLE public.page_seo
  ADD COLUMN IF NOT EXISTS page_type text DEFAULT 'Core Page',
  ADD COLUMN IF NOT EXISTS target_keyword text,
  ADD COLUMN IF NOT EXISTS cluster text,
  ADD COLUMN IF NOT EXISTS index_status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS gsc_impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gsc_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_position numeric(4,1),
  ADD COLUMN IF NOT EXISTS internal_links integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS schema_applied boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_content_update timestamp with time zone;

-- Part 2: Create seo_location_pages table for location-specific content
CREATE TABLE public.seo_location_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_seo_id uuid REFERENCES public.page_seo(id) ON DELETE CASCADE,
  neighborhood text NOT NULL,
  city text NOT NULL DEFAULT 'Dallas',
  state text NOT NULL DEFAULT 'TX',
  zip_code text,
  cluster text,
  page_type text NOT NULL DEFAULT 'Neighborhood Hub',
  url_slug text NOT NULL UNIQUE,
  h1_title text,
  housing_stock text,
  local_landmark text,
  utility_note text,
  primary_service text,
  recommended_system text,
  case_study_url text,
  template text DEFAULT 'Standard Neighborhood Hub',
  schema_enabled boolean DEFAULT true,
  schema_description text,
  add_to_service_areas_hub boolean DEFAULT true,
  published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.seo_location_pages ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins and managers can manage location pages
CREATE POLICY "Admins and managers can manage location pages"
  ON public.seo_location_pages FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- Public can read published location pages (for the frontend)
CREATE POLICY "Public can view published location pages"
  ON public.seo_location_pages FOR SELECT
  TO anon
  USING (published = true);

-- Auto-update updated_at
CREATE TRIGGER update_seo_location_pages_updated_at
  BEFORE UPDATE ON public.seo_location_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();