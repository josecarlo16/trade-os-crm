DROP POLICY IF EXISTS "Public can view published location pages" ON public.seo_location_pages;

CREATE POLICY "Everyone can view published location pages"
ON public.seo_location_pages
FOR SELECT
TO public
USING (published = true);