-- Backfill equipment_type from specs JSON for existing records
UPDATE equipment_pages
SET equipment_type = specs->>'equipment_type'
WHERE equipment_type IS NULL
  AND specs->>'equipment_type' IS NOT NULL;