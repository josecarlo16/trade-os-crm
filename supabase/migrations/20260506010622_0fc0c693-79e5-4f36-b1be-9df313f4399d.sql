INSERT INTO public.page_seo (page_path, page_name, meta_title, meta_description, canonical_url, page_type, cluster, schema_applied, structured_data, robots, last_content_update)
SELECT s.url_slug,
       COALESCE(s.h1_title, s.meta_title),
       s.meta_title,
       s.meta_description,
       'https://truficient.com' || s.url_slug,
       CASE WHEN s.page_type ILIKE '%Comparison%' THEN 'Brand Comparison'
            WHEN s.page_type ILIKE '%Spoke%' OR s.page_type ILIKE '%Hub%' THEN 'Brand Pillar'
            ELSE COALESCE(s.page_type, 'location') END,
       s.cluster,
       (s.schema_json IS NOT NULL),
       s.schema_json,
       'index, follow',
       now()
FROM public.seo_location_pages s
WHERE s.published = true
  AND NOT EXISTS (SELECT 1 FROM public.page_seo p WHERE p.page_path = s.url_slug);