-- Fix existing slugs that have slashes in brand portion (e.g., "goodman/amana/model" -> "goodman-amana/model")
-- This handles brands like "Goodman/Amana" that created multi-segment slugs

UPDATE equipment_pages
SET slug = 
  LOWER(REGEXP_REPLACE(brand, '[\s/]+', '-', 'g')) || 
  '/' || 
  LOWER(REGEXP_REPLACE(model_number, '\s+', '-', 'g'))
WHERE slug LIKE '%/%/%';