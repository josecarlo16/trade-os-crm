UPDATE public.page_seo
SET canonical_url = regexp_replace(canonical_url, '^https?://[^/]+', 'https://truficient.com')
WHERE canonical_url ILIKE '%lovable.app%';