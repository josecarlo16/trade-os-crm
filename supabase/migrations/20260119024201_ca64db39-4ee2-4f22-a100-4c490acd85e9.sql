-- Set all Goodman equipment to the "Efficient" tier
UPDATE ducted_equipment 
SET efficiency_tier_id = '8dcbc204-ccb8-44cf-8f9f-e5cdd503235c'
WHERE brand ILIKE '%goodman%';