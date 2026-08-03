-- Add archived_at column for soft-archive support
ALTER TABLE public.campaign_landing_pages
ADD COLUMN archived_at timestamptz DEFAULT NULL;

-- Add archived_at to landing_page_forms too
ALTER TABLE public.landing_page_forms
ADD COLUMN archived_at timestamptz DEFAULT NULL;