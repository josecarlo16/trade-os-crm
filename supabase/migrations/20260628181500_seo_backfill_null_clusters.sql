-- Backfill `cluster` on the 12 published seo_location_pages rows that had a
-- NULL cluster (found during the 2026-06-28 internal-linking audit). A null
-- cluster excludes a page from its topical cluster hub and from the RelatedPages
-- "nearby areas" bucket, leaving it thinly linked. These assignments join each
-- page to its intended set (UHI, brand, commercial, geo/housing).
--
-- Idempotent: each statement is guarded by `cluster IS NULL`, so re-running is a
-- no-op and it will never overwrite a cluster set after this migration.

-- UHI (urban heat island) research set (joins ~40 existing pages)
UPDATE public.seo_location_pages SET cluster = 'Dallas UHI Research'
  WHERE url_slug = '/dallas-warehouse-industrial-uhi-hvac/' AND cluster IS NULL;
UPDATE public.seo_location_pages SET cluster = 'Dallas UHI Research'
  WHERE url_slug = '/commercial-landlord-uhi-playbook-dallas/' AND cluster IS NULL;
UPDATE public.seo_location_pages SET cluster = 'Dallas UHI Research'
  WHERE url_slug = '/dallas-winter-cold-snap-hvac-uhi/' AND cluster IS NULL;

-- Brand sets
UPDATE public.seo_location_pages SET cluster = 'Brand - Bosch'
  WHERE url_slug = '/bosch-inverter-ducted-lower-greenville-dallas/' AND cluster IS NULL;
UPDATE public.seo_location_pages SET cluster = 'Brand - Mitsubishi'
  WHERE url_slug = '/mitsubishi-mini-split-lakewood-dallas/' AND cluster IS NULL;
UPDATE public.seo_location_pages SET cluster = 'Brand - Goodman'
  WHERE url_slug = '/goodman-variable-speed-lakewood-dallas/' AND cluster IS NULL;
UPDATE public.seo_location_pages SET cluster = 'Brand - Trane'
  WHERE url_slug = '/trane-trucomfort-oak-lawn-uptown-dallas/' AND cluster IS NULL;
UPDATE public.seo_location_pages SET cluster = 'Brand - Trane'
  WHERE url_slug = '/trane-trucomfort-richardson-tx/' AND cluster IS NULL;

-- Commercial set
UPDATE public.seo_location_pages SET cluster = 'Dallas Commercial Services'
  WHERE url_slug = '/commercial-rtu-replacement-dallas/' AND cluster IS NULL;
UPDATE public.seo_location_pages SET cluster = 'Dallas Commercial Services'
  WHERE url_slug = '/commercial-hvac-medical-district-dallas/' AND cluster IS NULL;

-- Geo / housing-type sets
UPDATE public.seo_location_pages SET cluster = 'Highland Park / UP'
  WHERE url_slug = '/mini-split-installation-highland-park-tx/' AND cluster IS NULL;
UPDATE public.seo_location_pages SET cluster = 'Housing Type'
  WHERE url_slug = '/hvac-craftsman-bungalow-dallas-tx/' AND cluster IS NULL;
