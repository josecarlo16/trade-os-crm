-- Remove serial_number from all existing equipment_pages.specs JSONB
-- This cleans up any previously leaked private data
UPDATE equipment_pages
SET specs = specs - 'serial_number'
WHERE specs ? 'serial_number';