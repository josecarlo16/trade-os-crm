-- Create public bucket for ductless unit images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ductless-images',
  'ductless-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Only admins can upload ductless images
CREATE POLICY "Admins can upload ductless images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ductless-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Only admins can update ductless images
CREATE POLICY "Admins can update ductless images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ductless-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Only admins can delete ductless images
CREATE POLICY "Admins can delete ductless images"
ON storage.objects FOR DELETE
USING (bucket_id = 'ductless-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Anyone can view ductless images (public bucket)
CREATE POLICY "Anyone can view ductless images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ductless-images');