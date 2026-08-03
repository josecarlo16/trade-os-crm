-- Add sort_order column to ducted_tonnage_sizing_rules for drag-and-drop reordering
ALTER TABLE ducted_tonnage_sizing_rules 
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order based on existing ordering
WITH ordered_rules AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY home_type, layout, sq_ft_min) as rn
  FROM ducted_tonnage_sizing_rules
)
UPDATE ducted_tonnage_sizing_rules
SET sort_order = ordered_rules.rn
FROM ordered_rules
WHERE ducted_tonnage_sizing_rules.id = ordered_rules.id;