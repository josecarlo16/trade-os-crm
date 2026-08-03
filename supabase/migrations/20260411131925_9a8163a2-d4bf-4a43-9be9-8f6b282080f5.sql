
-- 1. Add tag_type to gallery_tags
ALTER TABLE gallery_tags ADD COLUMN IF NOT EXISTS tag_type TEXT;

-- Classify existing tags
UPDATE gallery_tags SET tag_type = 'system' WHERE slug IN ('mitsubishi', 'bosch', 'trane', 'goodman', 'carrier', 'daikin', 'ductless', 'ducted', 'heat-pump', 'vrf', 'ceiling-cassette-1-way', 'ceiling-cassette-4-way', 'flour-mounted', 'wall-mounted', 'branch-box', 'captivaire-doas', 'spiral-duct', 'furnace');
UPDATE gallery_tags SET tag_type = 'service' WHERE slug IN ('ac-replacement', 'new-construction', 'before-after');
UPDATE gallery_tags SET tag_type = 'property' WHERE slug IN ('residential', 'commercial');

-- 2. Add gallery metadata to seo_location_pages
ALTER TABLE seo_location_pages
  ADD COLUMN IF NOT EXISTS geography_tag TEXT,
  ADD COLUMN IF NOT EXISTS zip_tag TEXT,
  ADD COLUMN IF NOT EXISTS city_tag TEXT DEFAULT 'Dallas',
  ADD COLUMN IF NOT EXISTS service_tags TEXT[],
  ADD COLUMN IF NOT EXISTS property_tags TEXT[],
  ADD COLUMN IF NOT EXISTS gallery_heading TEXT;

-- 3. Add approval & legacy fields to gallery_images
ALTER TABLE gallery_images
  ADD COLUMN IF NOT EXISTS approved_for_website BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_date DATE;

-- Mark existing active images as legacy + approved
UPDATE gallery_images SET is_legacy = true, approved_for_website = true WHERE is_active = true;
