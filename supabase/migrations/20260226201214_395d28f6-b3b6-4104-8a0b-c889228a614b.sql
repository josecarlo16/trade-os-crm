
-- Table to track campaign landing pages with links and notes
CREATE TABLE public.campaign_landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  platform TEXT DEFAULT 'facebook',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaign pages"
  ON public.campaign_landing_pages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert campaign pages"
  ON public.campaign_landing_pages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update campaign pages"
  ON public.campaign_landing_pages FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete campaign pages"
  ON public.campaign_landing_pages FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_campaign_landing_pages_updated_at
  BEFORE UPDATE ON public.campaign_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing campaign pages
INSERT INTO public.campaign_landing_pages (name, slug, url, platform, notes) VALUES
  ('Smart Group March (Facebook)', 'smart-group-march', '/smart-group-march', 'facebook', 'CTA-only redirect to scanner. Uses CampaignLandingPage template.'),
  ('Smart Group March (Google)', 'smart-group-march-g', '/smart-group-march-g', 'google', 'CTA-only redirect to scanner. Google Ads variant.'),
  ('March Group Buy Landing', 'smart-group-march-F-26', '/smart-group-march-F-26', 'facebook', 'Full lead-capture landing page for Goodman SD Group Buy. March 2026 campaign.'),
  ('Free HVAC Age Checker (Facebook)', 'free-hvac-age-checker-fb-feb-2026', '/free-hvac-age-checker-fb-feb-2026', 'facebook', 'Scanner promo landing page for Facebook ads.');
