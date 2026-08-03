UPDATE public.page_seo
SET canonical_url = REPLACE(canonical_url, 'https://www.truficient.com', 'https://truficient.com'),
    updated_at = now()
WHERE canonical_url ILIKE '%www.truficient.com%';