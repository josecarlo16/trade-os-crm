
INSERT INTO page_seo (page_path, page_name, meta_title, meta_description, page_type, schema_applied, index_status)
SELECT 
  slp.url_slug,
  slp.neighborhood,
  slp.meta_title,
  slp.meta_description,
  CASE 
    WHEN slp.page_type = 'Neighborhood Hub' THEN 'Neighborhood Hub'
    WHEN slp.page_type = 'Educational' THEN 'Brand Pillar'
    WHEN slp.page_type = 'Explainer' THEN 'Brand Pillar'
    WHEN slp.page_type = 'Housing Type' THEN 'Housing Type'
    WHEN slp.page_type = 'Commercial' THEN 'Commercial'
    ELSE 'location'
  END,
  true,
  'Pending'
FROM seo_location_pages slp
LEFT JOIN page_seo ps ON ps.page_path = slp.url_slug
WHERE ps.id IS NULL;
