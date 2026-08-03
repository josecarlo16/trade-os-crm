-- Create social_links table for managing social media URLs
CREATE TABLE public.social_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL UNIQUE,
  url TEXT,
  display_name TEXT NOT NULL,
  icon_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- Public can read active social links (for Footer, Testimonials, etc.)
CREATE POLICY "Anyone can view social links"
ON public.social_links
FOR SELECT
USING (true);

-- Only admins can insert social links
CREATE POLICY "Admins can insert social links"
ON public.social_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can update social links
CREATE POLICY "Admins can update social links"
ON public.social_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can delete social links
CREATE POLICY "Admins can delete social links"
ON public.social_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_social_links_updated_at
BEFORE UPDATE ON public.social_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with initial platforms
INSERT INTO public.social_links (platform, display_name, icon_name, url, is_active) VALUES
('facebook', 'Facebook', 'Facebook', 'https://www.facebook.com/truficient', true),
('instagram', 'Instagram', 'Instagram', 'https://www.instagram.com/truficient_hvac', true),
('linkedin', 'LinkedIn', 'Linkedin', 'https://www.linkedin.com/company/truficient/', true),
('yelp', 'Yelp', 'Yelp', 'https://www.yelp.com/biz/truficient-energy-solutions-richardson', true),
('google_maps', 'Google Maps', 'MapPin', '', false),
('houzz', 'Houzz', 'Home', 'https://www.houzz.com/professionals/heating-and-cooling-sales-and-repair/truficient-energy-solutions-pfvwus-pf~127901012', true);