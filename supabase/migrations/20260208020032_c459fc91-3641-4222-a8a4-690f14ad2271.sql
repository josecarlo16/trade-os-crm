-- Create role_permissions table for granular permission management
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage permissions (uses SECURITY DEFINER function)
CREATE POLICY "Super admins can manage permissions"
  ON public.role_permissions
  FOR ALL
  USING (is_super_admin(auth.uid()));

-- All authenticated users can read (for nav filtering)
CREATE POLICY "Authenticated users can read permissions"
  ON public.role_permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default permissions for admin role
INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  -- Overview
  ('admin', 'nav.dashboard', true),
  ('admin', 'nav.abandoned-carts', true),
  -- CRM
  ('admin', 'nav.customers', true),
  ('admin', 'nav.locations', true),
  ('admin', 'nav.submissions', true),
  ('admin', 'nav.pipeline', true),
  ('admin', 'nav.dfw-watchlist', true),
  -- Operations
  ('admin', 'nav.calendar', true),
  ('admin', 'nav.jobs', true),
  ('admin', 'nav.teams', true),
  ('admin', 'nav.workedge', true),
  ('admin', 'nav.job-types', true),
  ('admin', 'nav.calendars', true),
  -- Content
  ('admin', 'nav.blog', true),
  ('admin', 'nav.gallery', true),
  ('admin', 'nav.equipment-library', true),
  -- Estimators
  ('admin', 'nav.estimates', true),
  ('admin', 'nav.estimate-templates', true),
  ('admin', 'nav.system-pricing', true),
  ('admin', 'nav.customer-equipment', true),
  ('admin', 'nav.ductless-config', true),
  -- Financials
  ('admin', 'nav.materials', true),
  ('admin', 'nav.labor-rates', true),
  ('admin', 'nav.admin-costs', true),
  ('admin', 'nav.financing', true),
  -- Marketing
  ('admin', 'nav.seo', true),
  ('admin', 'nav.calculators', true),
  ('admin', 'nav.landing-pages', true),
  ('admin', 'nav.ghl-tags', true),
  ('admin', 'nav.ghl-conversations', true),
  -- Analytics
  ('admin', 'nav.scanner-analytics', true),
  ('admin', 'nav.button-clicks', true),
  ('admin', 'nav.analytics', true),
  ('admin', 'nav.social-media', true),
  -- System
  ('admin', 'nav.users', true),
  ('admin', 'nav.ai-settings', true),
  ('admin', 'nav.automations', true),
  ('admin', 'nav.lead-sources', true),
  ('admin', 'nav.campaign-tags', true),
  ('admin', 'nav.trash-bin', true),
  ('admin', 'nav.settings', true);

-- Seed default permissions for manager role (more restricted)
INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  -- Overview
  ('manager', 'nav.dashboard', true),
  ('manager', 'nav.abandoned-carts', false),
  -- CRM
  ('manager', 'nav.customers', true),
  ('manager', 'nav.locations', true),
  ('manager', 'nav.submissions', true),
  ('manager', 'nav.pipeline', true),
  ('manager', 'nav.dfw-watchlist', false),
  -- Operations
  ('manager', 'nav.calendar', true),
  ('manager', 'nav.jobs', true),
  ('manager', 'nav.teams', true),
  ('manager', 'nav.workedge', true),
  ('manager', 'nav.job-types', false),
  ('manager', 'nav.calendars', false),
  -- Content
  ('manager', 'nav.blog', true),
  ('manager', 'nav.gallery', false),
  ('manager', 'nav.equipment-library', false),
  -- Estimators
  ('manager', 'nav.estimates', false),
  ('manager', 'nav.estimate-templates', false),
  ('manager', 'nav.system-pricing', false),
  ('manager', 'nav.customer-equipment', false),
  ('manager', 'nav.ductless-config', false),
  -- Financials
  ('manager', 'nav.materials', false),
  ('manager', 'nav.labor-rates', false),
  ('manager', 'nav.admin-costs', false),
  ('manager', 'nav.financing', false),
  -- Marketing
  ('manager', 'nav.seo', false),
  ('manager', 'nav.calculators', false),
  ('manager', 'nav.landing-pages', false),
  ('manager', 'nav.ghl-tags', false),
  ('manager', 'nav.ghl-conversations', false),
  -- Analytics
  ('manager', 'nav.scanner-analytics', false),
  ('manager', 'nav.button-clicks', false),
  ('manager', 'nav.analytics', false),
  ('manager', 'nav.social-media', false),
  -- System
  ('manager', 'nav.users', false),
  ('manager', 'nav.ai-settings', false),
  ('manager', 'nav.automations', false),
  ('manager', 'nav.lead-sources', false),
  ('manager', 'nav.campaign-tags', false),
  ('manager', 'nav.trash-bin', false),
  ('manager', 'nav.settings', true);