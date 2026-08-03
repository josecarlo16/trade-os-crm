-- Create page_seo table for managing SEO settings per page
CREATE TABLE public.page_seo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  canonical_url TEXT,
  robots TEXT DEFAULT 'index, follow',
  structured_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view SEO settings (needed for frontend)
CREATE POLICY "Anyone can view page SEO"
ON public.page_seo FOR SELECT
USING (true);

-- Policy: Authenticated users can insert SEO settings
CREATE POLICY "Authenticated users can insert page SEO"
ON public.page_seo FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update SEO settings
CREATE POLICY "Authenticated users can update page SEO"
ON public.page_seo FOR UPDATE
TO authenticated
USING (true);

-- Policy: Authenticated users can delete SEO settings
CREATE POLICY "Authenticated users can delete page SEO"
ON public.page_seo FOR DELETE
TO authenticated
USING (true);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_page_seo_updated_at
BEFORE UPDATE ON public.page_seo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster path lookups
CREATE INDEX idx_page_seo_path ON public.page_seo(page_path);

-- Insert default SEO settings for existing pages
INSERT INTO public.page_seo (page_path, page_name, meta_title, meta_description) VALUES
('/', 'Home', 'Truficient Energy Solutions | HVAC Services in Dallas-Fort Worth', 'Expert heating and cooling services in the Dallas-Fort Worth area. AC repair, installation, and maintenance by certified technicians.'),
('/about', 'About Us', 'About Truficient Energy Solutions | Our Story', 'Learn about Truficient Energy Solutions, your trusted HVAC partner in Dallas-Fort Worth with certified technicians and quality service.'),
('/residential-services', 'Residential Services', 'Residential HVAC Services | Truficient Energy Solutions', 'Complete residential heating and cooling solutions including AC repair, furnace maintenance, and new system installation.'),
('/commercial-services', 'Commercial Services', 'Commercial HVAC Services | Truficient Energy Solutions', 'Professional commercial HVAC services for businesses in Dallas-Fort Worth. Maintenance contracts, repairs, and installations.'),
('/contact', 'Contact', 'Contact Us | Truficient Energy Solutions', 'Get in touch with Truficient Energy Solutions for HVAC service, quotes, or questions. Serving Dallas-Fort Worth area.'),
('/blog', 'Blog', 'HVAC Tips & News | Truficient Energy Solutions Blog', 'Read the latest HVAC tips, energy-saving advice, and news from Truficient Energy Solutions.');