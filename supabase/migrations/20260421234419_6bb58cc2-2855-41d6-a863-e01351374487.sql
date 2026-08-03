UPDATE public.blog_posts
SET slug = 'north-texas-water-crisis-conservation',
    canonical_url = 'https://truficient.com/blog/north-texas-water-crisis-conservation',
    updated_at = now()
WHERE slug = 'north-texas-water-crisis-deep-dive';

INSERT INTO public.page_seo (
  page_path, page_name, meta_title, meta_description,
  og_title, og_description, og_image, canonical_url,
  robots, page_type, target_keyword, cluster, index_status
) VALUES (
  '/blog/north-texas-water-crisis-conservation',
  'North Texas Water Crisis & Conservation (Hub)',
  'North Texas Water Crisis & Conservation: A Deep Dive | Truficient',
  'How the North Texas water crisis will reshape Dallas-Fort Worth over the coming decades — restrictions, conservation, HVAC water use, and what homeowners can do.',
  'North Texas Water Crisis & Conservation: A Deep Dive',
  'How the North Texas water crisis will reshape DFW over the coming decades — restrictions, conservation, and HVAC water use.',
  'https://truficient.com/og-image.png',
  'https://truficient.com/blog/north-texas-water-crisis-conservation',
  'index, follow',
  'blog',
  'north texas water crisis',
  'water-conservation',
  'indexable'
)
ON CONFLICT (page_path) DO UPDATE SET
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  og_title = EXCLUDED.og_title,
  og_description = EXCLUDED.og_description,
  og_image = EXCLUDED.og_image,
  canonical_url = EXCLUDED.canonical_url,
  updated_at = now();