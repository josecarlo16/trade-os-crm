-- Helper: insert page_seo + seo_location_pages for 5 inverter cluster pages
WITH pages(slug, page_name, meta_title, meta_desc, h1, neighborhood, zip, cluster, page_type, search_intent, schema_desc, schema_json) AS (
  VALUES
  ('/inverter-vs-single-stage-ac-dallas/', 'Inverter vs Single-Stage AC Dallas',
   'Inverter vs Single-Stage AC — What Dallas Homeowners Need to Know | Truficient',
   'Inverter vs single-stage vs two-stage AC explained for Dallas. How variable-speed cooling controls humidity, cuts electric bills, and lasts longer. Call 214-238-4349.',
   'Inverter vs. Single-Stage AC: What Dallas Homeowners Need to Know',
   'Dallas', '75208', 'Technical Education', 'Technical Education', 'informational',
   'Inverter vs single-stage vs two-stage AC explained for Dallas homeowners. How variable-speed cooling improves comfort, humidity control, and energy efficiency. Truficient Energy Solutions.',
   '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com/inverter-vs-single-stage-ac-dallas/","telephone":"214-238-4349","email":"info@truficient.com","address":{"@type":"PostalAddress","addressLocality":"Dallas","addressRegion":"TX","postalCode":"75208","addressCountry":"US"},"geo":{"@type":"GeoCoordinates","latitude":32.7767,"longitude":-96.797},"areaServed":{"@type":"City","name":"Dallas","sameAs":"https://en.wikipedia.org/wiki/Dallas"},"description":"Inverter vs single-stage vs two-stage AC explained for Dallas homeowners.","priceRange":"$$"}'::jsonb),
  ('/goodman-variable-speed-lower-greenville-dallas/', 'Goodman Variable Speed Lower Greenville Dallas',
   'Goodman Variable Speed AC Lower Greenville Dallas | Truficient',
   'Goodman GXV6SS inverter AC for Lower Greenville and M Streets Dallas homes. Side-discharge for tight lots, R-32, lifetime compressor warranty. Call 214-238-4349.',
   'Goodman Variable Speed AC for Lower Greenville & M Streets Dallas',
   'Lower Greenville', '75206', 'Brand - Goodman x Lower Greenville', 'Neighborhood + Brand', 'commercial investigation',
   'Goodman GXV6SS variable-speed inverter AC and GZV6S heat pump installation in Lower Greenville and M Streets, Dallas TX.',
   '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com/goodman-variable-speed-lower-greenville-dallas/","telephone":"214-238-4349","email":"info@truficient.com","address":{"@type":"PostalAddress","addressLocality":"Lower Greenville","addressRegion":"TX","postalCode":"75206","addressCountry":"US"},"geo":{"@type":"GeoCoordinates","latitude":32.8262,"longitude":-96.7678},"areaServed":{"@type":"GeoCircle","geoMidpoint":{"@type":"GeoCoordinates","latitude":32.8262,"longitude":-96.7678},"geoRadius":"5000"},"description":"Goodman GXV6SS variable-speed inverter AC in Lower Greenville and M Streets, Dallas TX.","priceRange":"$$"}'::jsonb),
  ('/bosch-inverter-ducted-uptown-oak-lawn-dallas/', 'Bosch Inverter Ducted Uptown Oak Lawn Dallas',
   'Bosch Inverter Ducted AC Uptown & Oak Lawn Dallas | Truficient',
   'Bosch IDS inverter ducted and BGH96 dual-fuel for Uptown and Oak Lawn Dallas. Ultra-quiet for dense lots, R-454B. Call 214-238-4349.',
   'Bosch Inverter Ducted for Uptown and Oak Lawn Dallas — Quiet Performance for Dense Neighborhoods',
   'Uptown / Oak Lawn', '75204', 'Brand - Bosch x Uptown / Oak Lawn', 'Neighborhood + Brand', 'commercial investigation',
   'Bosch IDS inverter ducted and BGH96 dual-fuel heat pump installation in Uptown and Oak Lawn, Dallas TX.',
   '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com/bosch-inverter-ducted-uptown-oak-lawn-dallas/","telephone":"214-238-4349","email":"info@truficient.com","address":{"@type":"PostalAddress","addressLocality":"Uptown / Oak Lawn","addressRegion":"TX","postalCode":"75204","addressCountry":"US"},"geo":{"@type":"GeoCoordinates","latitude":32.8029,"longitude":-96.8015},"areaServed":{"@type":"GeoCircle","geoMidpoint":{"@type":"GeoCoordinates","latitude":32.8029,"longitude":-96.8015},"geoRadius":"5000"},"description":"Bosch IDS inverter ducted in Uptown and Oak Lawn, Dallas TX.","priceRange":"$$"}'::jsonb),
  ('/bosch-ids-light-premium-ultra-comparison/', 'Bosch IDS Light Premium Ultra Comparison',
   'Bosch IDS Light vs Premium vs Ultra — Which Tier? | Truficient',
   'Compare Bosch IDS Light, Light Plus, Premium, and Ultra inverter ducted tiers. SEER2, sound, modulation range, and which fits your Dallas home. Call 214-238-4349.',
   'Bosch IDS Light vs Light Plus vs Premium vs Ultra — Which Tier Is Right for Your Dallas Home?',
   'Dallas', '75208', 'Technical Education', 'Technical Education', 'informational',
   'Bosch IDS inverter ducted heat pump tier comparison — Light, Light Plus, Premium, Ultra.',
   '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com/bosch-ids-light-premium-ultra-comparison/","telephone":"214-238-4349","email":"info@truficient.com","address":{"@type":"PostalAddress","addressLocality":"Dallas","addressRegion":"TX","postalCode":"75208","addressCountry":"US"},"geo":{"@type":"GeoCoordinates","latitude":32.7767,"longitude":-96.797},"areaServed":{"@type":"City","name":"Dallas","sameAs":"https://en.wikipedia.org/wiki/Dallas"},"description":"Bosch IDS inverter ducted heat pump tier comparison.","priceRange":"$$"}'::jsonb),
  ('/best-inverter-ac-dallas/', 'Best Inverter AC Dallas',
   'Best Inverter AC for Dallas TX — 3 Brands Compared | Truficient',
   'Compare Goodman GXV6SS, Trane TruComfort, and Bosch IDS inverter air conditioners for Dallas cooling. Side-discharge, WeatherGuard, quiet operation. Call 214-238-4349.',
   'Best Inverter Air Conditioner for Dallas TX — Three Brands Compared',
   'Dallas', '75208', 'Cross-Brand Comparison', 'Cross-Brand Comparison', 'commercial investigation',
   'Compare Goodman GXV6SS, Trane TruComfort, and Bosch IDS inverter air conditioners for Dallas TX.',
   '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com/best-inverter-ac-dallas/","telephone":"214-238-4349","email":"info@truficient.com","address":{"@type":"PostalAddress","addressLocality":"Dallas","addressRegion":"TX","postalCode":"75208","addressCountry":"US"},"geo":{"@type":"GeoCoordinates","latitude":32.7767,"longitude":-96.797},"areaServed":{"@type":"City","name":"Dallas","sameAs":"https://en.wikipedia.org/wiki/Dallas"},"description":"Compare three best inverter air conditioners for Dallas TX.","priceRange":"$$"}'::jsonb)
),
upserted_seo AS (
  INSERT INTO public.page_seo (page_path, page_name, meta_title, meta_description, og_title, og_description, canonical_url, robots)
  SELECT slug, page_name, meta_title, meta_desc, meta_title, meta_desc, 'https://truficient.com' || slug, 'index, follow'
  FROM pages
  ON CONFLICT (page_path) DO UPDATE SET
    page_name = EXCLUDED.page_name,
    meta_title = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description,
    og_title = EXCLUDED.og_title,
    og_description = EXCLUDED.og_description,
    canonical_url = EXCLUDED.canonical_url,
    robots = EXCLUDED.robots,
    updated_at = now()
  RETURNING id, page_path
)
INSERT INTO public.seo_location_pages (
  neighborhood, city, state, zip_code, cluster, page_type, url_slug, h1_title,
  meta_title, meta_description, search_intent, audience, schema_enabled, schema_description, schema_json,
  published, page_seo_id
)
SELECT
  p.neighborhood, 'Dallas', 'TX', p.zip, p.cluster, p.page_type, p.slug, p.h1,
  p.meta_title, p.meta_desc, p.search_intent, 'residential', true, p.schema_desc, p.schema_json,
  true, u.id
FROM pages p
JOIN upserted_seo u ON u.page_path = p.slug
ON CONFLICT (url_slug) DO UPDATE SET
  h1_title = EXCLUDED.h1_title,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  cluster = EXCLUDED.cluster,
  page_type = EXCLUDED.page_type,
  schema_json = EXCLUDED.schema_json,
  schema_description = EXCLUDED.schema_description,
  published = true,
  page_seo_id = EXCLUDED.page_seo_id,
  updated_at = now();