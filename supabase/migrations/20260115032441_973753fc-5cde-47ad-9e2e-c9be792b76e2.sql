-- Create table for tracking social media link clicks
CREATE TABLE public.social_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  social_link_id UUID REFERENCES public.social_links(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'unknown', -- 'footer', 'testimonials', etc.
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT
);

-- Enable Row Level Security
ALTER TABLE public.social_link_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert clicks (for tracking)
CREATE POLICY "Anyone can insert clicks"
ON public.social_link_clicks
FOR INSERT
WITH CHECK (true);

-- Only admins can view click analytics
CREATE POLICY "Admins can view clicks"
ON public.social_link_clicks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster analytics queries
CREATE INDEX idx_social_link_clicks_platform ON public.social_link_clicks(platform);
CREATE INDEX idx_social_link_clicks_clicked_at ON public.social_link_clicks(clicked_at);