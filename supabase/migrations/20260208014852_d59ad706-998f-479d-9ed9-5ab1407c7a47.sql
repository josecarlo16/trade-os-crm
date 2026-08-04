-- Comprehensive RLS Policy Update for Super Admin Access
-- This migration updates all policies that exclude super_admin

-- ============================================
-- CATEGORY 1: Admin-Only Management Tables
-- ============================================

-- 1. admin_costs
DROP POLICY IF EXISTS "Admins can manage admin costs" ON admin_costs;
CREATE POLICY "Admins can manage admin costs" ON admin_costs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 2. author_profiles
DROP POLICY IF EXISTS "Admins can manage author profiles" ON author_profiles;
CREATE POLICY "Admins can manage author profiles" ON author_profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 3. blog_tags
DROP POLICY IF EXISTS "Admins can manage blog tags" ON blog_tags;
CREATE POLICY "Admins can manage blog tags" ON blog_tags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 4. button_clicks -- SKIPPED: this table exists in Truficient's live DB
-- (created directly via the Lovable dashboard, not through any migration
-- in this history) but doesn't exist in a fresh database built purely from
-- migrations, and it's out of scope for trade-os-crm anyway.

-- 5. crm_campaign_tags
DROP POLICY IF EXISTS "Admins can manage campaign tags" ON crm_campaign_tags;
CREATE POLICY "Admins can manage campaign tags" ON crm_campaign_tags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 6. crm_job_stages
DROP POLICY IF EXISTS "Admins can manage job stages" ON crm_job_stages;
CREATE POLICY "Admins can manage job stages" ON crm_job_stages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 7. crm_job_types
DROP POLICY IF EXISTS "Admins can manage job types" ON crm_job_types;
CREATE POLICY "Admins can manage job types" ON crm_job_types
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 8. crm_pipeline_stages
DROP POLICY IF EXISTS "Admins can manage pipeline stages" ON crm_pipeline_stages;
CREATE POLICY "Admins can manage pipeline stages" ON crm_pipeline_stages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 9. crm_submission_links (DELETE only - INSERT handled in Category 2)
DROP POLICY IF EXISTS "Admins can delete submission links" ON crm_submission_links;
CREATE POLICY "Admins can delete submission links" ON crm_submission_links
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 10. crm_teams
DROP POLICY IF EXISTS "Admins can manage teams" ON crm_teams;
CREATE POLICY "Admins can manage teams" ON crm_teams
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 11. crm_team_members (DELETE only - INSERT/UPDATE handled in Category 2)
DROP POLICY IF EXISTS "Admins can delete team members" ON crm_team_members;
CREATE POLICY "Admins can delete team members" ON crm_team_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 12. crm_customer_contacts (DELETE only - INSERT/UPDATE handled in Category 2)
DROP POLICY IF EXISTS "Admins can delete contacts" ON crm_customer_contacts;
CREATE POLICY "Admins can delete contacts" ON crm_customer_contacts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 13. documentation_search_log
DROP POLICY IF EXISTS "Admins can view search logs" ON documentation_search_log;
CREATE POLICY "Admins can view search logs" ON documentation_search_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 14. ducted_addons
DROP POLICY IF EXISTS "Admins can manage ducted addons" ON ducted_addons;
CREATE POLICY "Admins can manage ducted addons" ON ducted_addons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 15. ducted_efficiency_tiers
DROP POLICY IF EXISTS "Admins can manage ducted efficiency tiers" ON ducted_efficiency_tiers;
CREATE POLICY "Admins can manage ducted efficiency tiers" ON ducted_efficiency_tiers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 16. ducted_equipment
DROP POLICY IF EXISTS "Admins can manage ducted equipment" ON ducted_equipment;
CREATE POLICY "Admins can manage ducted equipment" ON ducted_equipment
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 17. ducted_pricing_modifiers
DROP POLICY IF EXISTS "Admins can manage ducted pricing modifiers" ON ducted_pricing_modifiers;
CREATE POLICY "Admins can manage ducted pricing modifiers" ON ducted_pricing_modifiers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 18. ducted_tonnage_sizing_rules
DROP POLICY IF EXISTS "Admins can manage ducted tonnage rules" ON ducted_tonnage_sizing_rules;
CREATE POLICY "Admins can manage ducted tonnage rules" ON ducted_tonnage_sizing_rules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 19. ductless_addons
DROP POLICY IF EXISTS "Admins can manage addons" ON ductless_addons;
CREATE POLICY "Admins can manage addons" ON ductless_addons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 20. ductless_system_tiers
DROP POLICY IF EXISTS "Admins can manage system tiers" ON ductless_system_tiers;
CREATE POLICY "Admins can manage system tiers" ON ductless_system_tiers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 21. ductless_unit_size_pricing (admin management - manager SELECT handled in Category 2)
DROP POLICY IF EXISTS "Admins can manage size pricing" ON ductless_unit_size_pricing;
CREATE POLICY "Admins can manage size pricing" ON ductless_unit_size_pricing
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 22. ductless_unit_types
DROP POLICY IF EXISTS "Admins can manage unit types" ON ductless_unit_types;
CREATE POLICY "Admins can manage unit types" ON ductless_unit_types
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 23. equipment_documentation
DROP POLICY IF EXISTS "Admins can manage equipment documentation" ON equipment_documentation;
CREATE POLICY "Admins can manage equipment documentation" ON equipment_documentation
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 24. equipment_pages
DROP POLICY IF EXISTS "Admins can manage equipment pages" ON equipment_pages;
CREATE POLICY "Admins can manage equipment pages" ON equipment_pages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 25. equipment_systems
DROP POLICY IF EXISTS "Admins can view equipment systems" ON equipment_systems;
DROP POLICY IF EXISTS "Admins can insert equipment systems" ON equipment_systems;
DROP POLICY IF EXISTS "Admins can update equipment systems" ON equipment_systems;
DROP POLICY IF EXISTS "Admins can delete equipment systems" ON equipment_systems;

CREATE POLICY "Admins can view equipment systems" ON equipment_systems
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can insert equipment systems" ON equipment_systems
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can update equipment systems" ON equipment_systems
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete equipment systems" ON equipment_systems
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 26. estimate_line_items
DROP POLICY IF EXISTS "Admins can manage estimate line items" ON estimate_line_items;
CREATE POLICY "Admins can manage estimate line items" ON estimate_line_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 27. estimate_templates
DROP POLICY IF EXISTS "Admins can view estimate templates" ON estimate_templates;
DROP POLICY IF EXISTS "Admins can insert estimate templates" ON estimate_templates;
DROP POLICY IF EXISTS "Admins can update estimate templates" ON estimate_templates;
DROP POLICY IF EXISTS "Admins can delete estimate templates" ON estimate_templates;

CREATE POLICY "Admins can view estimate templates" ON estimate_templates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can insert estimate templates" ON estimate_templates
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can update estimate templates" ON estimate_templates
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete estimate templates" ON estimate_templates
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 28. estimate_template_items
DROP POLICY IF EXISTS "Admins can view template items" ON estimate_template_items;
DROP POLICY IF EXISTS "Admins can insert template items" ON estimate_template_items;
DROP POLICY IF EXISTS "Admins can update template items" ON estimate_template_items;
DROP POLICY IF EXISTS "Admins can delete template items" ON estimate_template_items;

CREATE POLICY "Admins can view template items" ON estimate_template_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can insert template items" ON estimate_template_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can update template items" ON estimate_template_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete template items" ON estimate_template_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 29. estimate_versions
DROP POLICY IF EXISTS "Admins can manage estimate versions" ON estimate_versions;
CREATE POLICY "Admins can manage estimate versions" ON estimate_versions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 30. estimates
DROP POLICY IF EXISTS "Admins can manage estimates" ON estimates;
CREATE POLICY "Admins can manage estimates" ON estimates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 31. financing_options (admin management - keep public SELECT)
DROP POLICY IF EXISTS "Admins can insert financing options" ON financing_options;
DROP POLICY IF EXISTS "Admins can update financing options" ON financing_options;
DROP POLICY IF EXISTS "Admins can delete financing options" ON financing_options;

CREATE POLICY "Admins can insert financing options" ON financing_options
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can update financing options" ON financing_options
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete financing options" ON financing_options
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 32. form_source_tags
DROP POLICY IF EXISTS "Admins can manage form source tags" ON form_source_tags;
CREATE POLICY "Admins can manage form source tags" ON form_source_tags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 33. gallery_image_tags
DROP POLICY IF EXISTS "Admins can manage image tags" ON gallery_image_tags;
CREATE POLICY "Admins can manage image tags" ON gallery_image_tags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 34. gallery_images
DROP POLICY IF EXISTS "Admins can manage images" ON gallery_images;
CREATE POLICY "Admins can manage images" ON gallery_images
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 35. gallery_tags
DROP POLICY IF EXISTS "Admins can manage tags" ON gallery_tags;
CREATE POLICY "Admins can manage tags" ON gallery_tags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 36. ghl_tags
DROP POLICY IF EXISTS "Admins can manage ghl_tags" ON ghl_tags;
CREATE POLICY "Admins can manage ghl_tags" ON ghl_tags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 37. job_applications
DROP POLICY IF EXISTS "Admins can view applications" ON job_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON job_applications;
DROP POLICY IF EXISTS "Admins can delete applications" ON job_applications;

CREATE POLICY "Admins can view applications" ON job_applications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can update applications" ON job_applications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete applications" ON job_applications
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 38. labor_rates
DROP POLICY IF EXISTS "Admins can manage labor rates" ON labor_rates;
CREATE POLICY "Admins can manage labor rates" ON labor_rates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 39. landing_page_forms
DROP POLICY IF EXISTS "Admins can manage landing_page_forms" ON landing_page_forms;
CREATE POLICY "Admins can manage landing_page_forms" ON landing_page_forms
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 40. landing_page_form_tags
DROP POLICY IF EXISTS "Admins can manage landing_page_form_tags" ON landing_page_form_tags;
CREATE POLICY "Admins can manage landing_page_form_tags" ON landing_page_form_tags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 41. lead_sources
DROP POLICY IF EXISTS "Admins can manage lead sources" ON lead_sources;
CREATE POLICY "Admins can manage lead sources" ON lead_sources
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 42. materials_catalog
DROP POLICY IF EXISTS "Admins can manage materials" ON materials_catalog;
CREATE POLICY "Admins can manage materials" ON materials_catalog
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 43. price_books
DROP POLICY IF EXISTS "Admins can view price books" ON price_books;
DROP POLICY IF EXISTS "Admins can insert price books" ON price_books;
DROP POLICY IF EXISTS "Admins can delete price books" ON price_books;

CREATE POLICY "Admins can view price books" ON price_books
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can insert price books" ON price_books
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete price books" ON price_books
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 44. social_link_clicks
DROP POLICY IF EXISTS "Admins can view clicks" ON social_link_clicks;
CREATE POLICY "Admins can view clicks" ON social_link_clicks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 45. social_links
DROP POLICY IF EXISTS "Admins can view social links" ON social_links;
DROP POLICY IF EXISTS "Admins can insert social links" ON social_links;
DROP POLICY IF EXISTS "Admins can update social links" ON social_links;
DROP POLICY IF EXISTS "Admins can delete social links" ON social_links;

CREATE POLICY "Admins can view social links" ON social_links
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can insert social links" ON social_links
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can update social links" ON social_links
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete social links" ON social_links
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 46. tracking_settings
DROP POLICY IF EXISTS "Admins can insert tracking settings" ON tracking_settings;
DROP POLICY IF EXISTS "Admins can update tracking settings" ON tracking_settings;
DROP POLICY IF EXISTS "Admins can delete tracking settings" ON tracking_settings;

CREATE POLICY "Admins can insert tracking settings" ON tracking_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can update tracking settings" ON tracking_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete tracking settings" ON tracking_settings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 47. trash_bin
DROP POLICY IF EXISTS "Admins can view trash" ON trash_bin;
DROP POLICY IF EXISTS "Admins can insert to trash" ON trash_bin;
DROP POLICY IF EXISTS "Admins can delete from trash" ON trash_bin;

CREATE POLICY "Admins can view trash" ON trash_bin
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can insert to trash" ON trash_bin
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete from trash" ON trash_bin
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- 48. user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can update roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')));

CREATE POLICY "Admins can delete roles" ON user_roles
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin')));

-- 49. workedge_sync_log
DROP POLICY IF EXISTS "Admins can view sync logs" ON workedge_sync_log;
CREATE POLICY "Admins can view sync logs" ON workedge_sync_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin')));

-- ============================================
-- CATEGORY 2: Admin+Manager Tables
-- ============================================

-- 50. crm_customer_contacts (INSERT/UPDATE)
DROP POLICY IF EXISTS "Admins and managers can insert contacts" ON crm_customer_contacts;
DROP POLICY IF EXISTS "Admins and managers can update contacts" ON crm_customer_contacts;

CREATE POLICY "Admins and managers can insert contacts" ON crm_customer_contacts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

CREATE POLICY "Admins and managers can update contacts" ON crm_customer_contacts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

-- 51. crm_job_assignments
DROP POLICY IF EXISTS "Admins and managers can manage job assignments" ON crm_job_assignments;
CREATE POLICY "Admins and managers can manage job assignments" ON crm_job_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

-- 52. crm_job_stage_history
DROP POLICY IF EXISTS "Admins and managers can insert job stage history" ON crm_job_stage_history;
CREATE POLICY "Admins and managers can insert job stage history" ON crm_job_stage_history
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

-- 53. crm_submission_links (INSERT)
DROP POLICY IF EXISTS "Admins and managers can insert submission links" ON crm_submission_links;
CREATE POLICY "Admins and managers can insert submission links" ON crm_submission_links
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

-- 54. crm_team_assignments
DROP POLICY IF EXISTS "Admins and managers can manage team assignments" ON crm_team_assignments;
CREATE POLICY "Admins and managers can manage team assignments" ON crm_team_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

-- 55. crm_team_members (INSERT/UPDATE)
DROP POLICY IF EXISTS "Admins and managers can insert team members" ON crm_team_members;
DROP POLICY IF EXISTS "Admins and managers can update team members" ON crm_team_members;

CREATE POLICY "Admins and managers can insert team members" ON crm_team_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

CREATE POLICY "Admins and managers can update team members" ON crm_team_members
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

-- 56. ductless_unit_size_pricing (Manager SELECT)
DROP POLICY IF EXISTS "Managers can view size pricing" ON ductless_unit_size_pricing;
CREATE POLICY "Managers can view size pricing" ON ductless_unit_size_pricing
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

-- 57. google_calendars
DROP POLICY IF EXISTS "Admins and managers can insert calendars" ON google_calendars;
DROP POLICY IF EXISTS "Admins and managers can update calendars" ON google_calendars;
DROP POLICY IF EXISTS "Admins and managers can delete calendars" ON google_calendars;

CREATE POLICY "Admins and managers can insert calendars" ON google_calendars
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

CREATE POLICY "Admins and managers can update calendars" ON google_calendars
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

CREATE POLICY "Admins and managers can delete calendars" ON google_calendars
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));

-- 58. workedge_project_media
DROP POLICY IF EXISTS "Admins and managers can manage project media" ON workedge_project_media;
CREATE POLICY "Admins and managers can manage project media" ON workedge_project_media
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'manager')));