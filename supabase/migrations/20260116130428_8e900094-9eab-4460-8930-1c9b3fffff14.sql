-- Create estimate_section enum type with 5 values
CREATE TYPE estimate_section AS ENUM (
  'equipment_controls',
  'miscellaneous_inside',
  'ducting',
  'labor',
  'admin_costs'
);

-- Add section column to estimate_line_items
ALTER TABLE estimate_line_items 
ADD COLUMN section estimate_section DEFAULT 'miscellaneous_inside';

-- Add section column to estimate_template_items
ALTER TABLE estimate_template_items 
ADD COLUMN section estimate_section DEFAULT 'miscellaneous_inside';

-- Update existing line items based on item_type
UPDATE estimate_line_items SET section = 'equipment_controls' WHERE item_type = 'equipment';
UPDATE estimate_line_items SET section = 'labor' WHERE item_type = 'labor';
UPDATE estimate_line_items SET section = 'admin_costs' WHERE item_type = 'admin_cost';
UPDATE estimate_line_items SET section = 'miscellaneous_inside' WHERE item_type IN ('material', 'custom');

-- Update existing template items based on item_type
UPDATE estimate_template_items SET section = 'equipment_controls' WHERE item_type = 'equipment';
UPDATE estimate_template_items SET section = 'labor' WHERE item_type = 'labor';
UPDATE estimate_template_items SET section = 'admin_costs' WHERE item_type = 'admin_cost';
UPDATE estimate_template_items SET section = 'miscellaneous_inside' WHERE item_type IN ('material', 'custom');