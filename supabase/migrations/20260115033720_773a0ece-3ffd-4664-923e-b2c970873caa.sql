-- Create tracking_settings table for Meta Pixel and Google Analytics
CREATE TABLE public.tracking_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tracking_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (needed for frontend to load scripts)
CREATE POLICY "Anyone can view tracking settings"
ON public.tracking_settings
FOR SELECT
USING (true);

-- Only admins can modify tracking settings
CREATE POLICY "Admins can insert tracking settings"
ON public.tracking_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update tracking settings"
ON public.tracking_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete tracking settings"
ON public.tracking_settings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index on setting_key for faster lookups
CREATE INDEX idx_tracking_settings_key ON public.tracking_settings(setting_key);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tracking_settings_updated_at
BEFORE UPDATE ON public.tracking_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial tracking settings
INSERT INTO public.tracking_settings (setting_key, setting_value, is_enabled)
VALUES 
  ('meta_pixel_id', '', false),
  ('ga_measurement_id', '', false);