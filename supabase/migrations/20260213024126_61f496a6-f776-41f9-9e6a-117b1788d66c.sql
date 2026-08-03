
-- Create workedge-media public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('workedge-media', 'workedge-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view files (public bucket)
CREATE POLICY "WorkEdge media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'workedge-media');

-- Allow authenticated admin/manager users to upload
CREATE POLICY "Authenticated users can upload workedge media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workedge-media'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update workedge media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'workedge-media'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete workedge media
CREATE POLICY "Authenticated users can delete workedge media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workedge-media'
  AND auth.role() = 'authenticated'
);
