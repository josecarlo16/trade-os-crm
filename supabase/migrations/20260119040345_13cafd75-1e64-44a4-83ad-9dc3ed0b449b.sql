-- ============================================
-- FIX 1: Update SEER ranges to be exclusive
-- ============================================
UPDATE ducted_efficiency_tiers SET seer_min = 15, seer_max = 16.9 WHERE name = 'efficient';
UPDATE ducted_efficiency_tiers SET seer_min = 17, seer_max = 18.9 WHERE name = 'efficiency_plus';
UPDATE ducted_efficiency_tiers SET seer_min = 19, seer_max = 26 WHERE name = 'premium';

-- ============================================
-- FIX 2: Add missing tonnage rules for duplex
-- ============================================
INSERT INTO ducted_tonnage_sizing_rules (home_type, layout, sq_ft_min, sq_ft_max, recommended_tonnage, notes, is_active)
VALUES
  ('duplex', '1_story', 0, 1000, 1.5, 'Small duplex unit', true),
  ('duplex', '1_story', 1001, 1500, 2.0, 'Standard duplex unit', true),
  ('duplex', '1_story', 1501, 9999, 2.5, 'Large duplex unit', true),
  ('duplex', '2_stories', 0, 1200, 2.0, 'Small 2-story duplex', true),
  ('duplex', '2_stories', 1201, 2000, 2.5, 'Medium 2-story duplex', true),
  ('duplex', '2_stories', 2001, 9999, 3.0, 'Large 2-story duplex', true);

-- ============================================
-- FIX 3: Add missing tonnage rules for 'other'
-- ============================================
INSERT INTO ducted_tonnage_sizing_rules (home_type, layout, sq_ft_min, sq_ft_max, recommended_tonnage, notes, is_active)
VALUES
  ('other', '1_story', 0, 1000, 1.5, 'Small other structure', true),
  ('other', '1_story', 1001, 2000, 2.5, 'Medium other structure', true),
  ('other', '1_story', 2001, 9999, 3.5, 'Large other structure', true),
  ('other', '2_stories', 0, 1500, 2.0, 'Small 2-story other', true),
  ('other', '2_stories', 1501, 2500, 3.0, 'Medium 2-story other', true),
  ('other', '2_stories', 2501, 9999, 4.0, 'Large 2-story other', true);