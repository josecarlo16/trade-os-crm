-- Create gallery_tags table for organizing gallery images
CREATE TABLE public.gallery_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create gallery_images table
CREATE TABLE public.gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create junction table for many-to-many relationship
CREATE TABLE public.gallery_image_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.gallery_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(image_id, tag_id)
);

-- Enable RLS on all tables
ALTER TABLE public.gallery_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_image_tags ENABLE ROW LEVEL SECURITY;

-- Public read policies for gallery_tags
CREATE POLICY "Anyone can view active tags"
  ON public.gallery_tags
  FOR SELECT
  USING (is_active = true);

-- Admin policies for gallery_tags
CREATE POLICY "Admins can manage tags"
  ON public.gallery_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Public read policies for gallery_images
CREATE POLICY "Anyone can view active images"
  ON public.gallery_images
  FOR SELECT
  USING (is_active = true);

-- Admin policies for gallery_images
CREATE POLICY "Admins can manage images"
  ON public.gallery_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Public read policies for gallery_image_tags
CREATE POLICY "Anyone can view image tags"
  ON public.gallery_image_tags
  FOR SELECT
  USING (true);

-- Admin policies for gallery_image_tags
CREATE POLICY "Admins can manage image tags"
  ON public.gallery_image_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-images',
  'gallery-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies for gallery-images bucket
CREATE POLICY "Anyone can view gallery images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Admins can upload gallery images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'gallery-images' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update gallery images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'gallery-images' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete gallery images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'gallery-images' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default tags
INSERT INTO public.gallery_tags (name, slug, description, sort_order) VALUES
  ('Ductless', 'ductless', 'Ductless/Mini-Split Installations', 1),
  ('Residential', 'residential', 'Residential Installations', 2),
  ('Commercial', 'commercial', 'Commercial Installations', 3),
  ('Heat Pump', 'heat-pump', 'Heat Pump Systems', 4),
  ('AC Replacement', 'ac-replacement', 'AC Replacement Projects', 5),
  ('Before & After', 'before-after', 'Before & After Photos', 6);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER set_gallery_tags_updated_at
  BEFORE UPDATE ON public.gallery_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_gallery_images_updated_at
  BEFORE UPDATE ON public.gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();