-- Add media_type column with default 'image' for existing records
ALTER TABLE public.gallery_images 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- Add thumbnail_url for video thumbnails
ALTER TABLE public.gallery_images 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add constraint for valid media types
ALTER TABLE public.gallery_images 
ADD CONSTRAINT gallery_images_media_type_check 
CHECK (media_type IN ('image', 'video'));

-- Create index for filtering by media type
CREATE INDEX IF NOT EXISTS idx_gallery_images_media_type 
ON public.gallery_images(media_type);