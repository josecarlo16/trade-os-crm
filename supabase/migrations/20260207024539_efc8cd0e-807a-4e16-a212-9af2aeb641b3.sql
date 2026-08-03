-- Lead sources table for admin-configurable marketing sources
CREATE TABLE public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  color TEXT DEFAULT '#6b7280',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_sources
CREATE POLICY "Anyone can view active lead sources"
ON public.lead_sources FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can view all lead sources"
ON public.lead_sources FOR SELECT
USING (true);

CREATE POLICY "Admins can manage lead sources"
ON public.lead_sources FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Campaign tags table for customer segmentation
CREATE TABLE public.crm_campaign_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_campaign_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for crm_campaign_tags
CREATE POLICY "Authenticated users can view campaign tags"
ON public.crm_campaign_tags FOR SELECT
USING (true);

CREATE POLICY "Admins can manage campaign tags"
ON public.crm_campaign_tags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default lead sources
INSERT INTO public.lead_sources (name, display_name, category, sort_order) VALUES
  ('mitsubishi', 'Mitsubishi', 'partner', 1),
  ('bosch', 'Bosch', 'partner', 2),
  ('facebook', 'Facebook', 'marketing', 3),
  ('google', 'Google', 'marketing', 4),
  ('referral', 'Referral', 'organic', 5),
  ('phone', 'Phone Call', 'organic', 6),
  ('ducted_estimator', 'Ducted Estimator', 'organic', 7),
  ('ductless_estimator', 'Ductless Estimator', 'organic', 8),
  ('scanner', 'Equipment Scanner', 'organic', 9),
  ('contact_form', 'Contact Form', 'organic', 10),
  ('manual', 'Manual Entry', 'other', 99);