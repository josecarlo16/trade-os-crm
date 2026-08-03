-- Add sort_order column to materials_catalog for drag-and-drop ordering
ALTER TABLE materials_catalog 
ADD COLUMN sort_order integer DEFAULT 0;

-- Set initial sort order based on name alphabetically within each category
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY category ORDER BY name) as rn
  FROM materials_catalog
)
UPDATE materials_catalog
SET sort_order = ranked.rn
FROM ranked
WHERE materials_catalog.id = ranked.id;

-- Create index for efficient ordering queries
CREATE INDEX idx_materials_catalog_sort_order ON materials_catalog(category, sort_order);