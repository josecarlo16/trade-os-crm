ALTER TABLE public.seo_location_pages ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.seo_location_pages ADD COLUMN IF NOT EXISTS schema_json jsonb;
ALTER TABLE public.seo_location_pages ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE public.seo_location_pages ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.seo_location_pages ADD COLUMN IF NOT EXISTS search_intent text;
ALTER TABLE public.seo_location_pages ADD COLUMN IF NOT EXISTS audience text;