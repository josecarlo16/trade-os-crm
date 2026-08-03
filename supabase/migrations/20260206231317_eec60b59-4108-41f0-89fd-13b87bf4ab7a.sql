-- CRM Phase 1: Customer Database & Pipeline

-- =============================================
-- 1. CRM CUSTOMERS - Unified Customer Database
-- =============================================
CREATE TABLE public.crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_type TEXT NOT NULL DEFAULT 'residential' CHECK (customer_type IN ('residential', 'commercial')),
  customer_status TEXT NOT NULL DEFAULT 'lead' CHECK (customer_status IN ('lead', 'prospect', 'active', 'inactive', 'archived')),
  company_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  alternate_phone TEXT,
  preferred_contact_method TEXT DEFAULT 'phone' CHECK (preferred_contact_method IN ('phone', 'email', 'text')),
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  lead_source TEXT,
  ghl_contact_id TEXT,
  workedge_customer_id TEXT,
  tags TEXT[] DEFAULT '{}',
  assigned_to UUID,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for crm_customers
CREATE INDEX idx_crm_customers_status ON public.crm_customers(customer_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_customers_type ON public.crm_customers(customer_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_customers_email ON public.crm_customers(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_customers_phone ON public.crm_customers(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_customers_ghl ON public.crm_customers(ghl_contact_id) WHERE ghl_contact_id IS NOT NULL;
CREATE INDEX idx_crm_customers_lead_source ON public.crm_customers(lead_source) WHERE deleted_at IS NULL;

-- =============================================
-- 2. CRM LOCATIONS - Service Addresses/Properties
-- =============================================
CREATE TABLE public.crm_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  location_name TEXT,
  location_type TEXT DEFAULT 'residential' CHECK (location_type IN ('residential', 'commercial', 'multi_family')),
  building_type TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  county TEXT,
  square_footage INTEGER,
  year_built INTEGER,
  stories INTEGER,
  gate_code TEXT,
  access_notes TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  google_place_id TEXT,
  is_primary BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_locations_customer ON public.crm_locations(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_locations_zip ON public.crm_locations(zip_code) WHERE deleted_at IS NULL;

-- =============================================
-- 3. CRM CUSTOMER CONTACTS - Additional Contacts
-- =============================================
CREATE TABLE public.crm_customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL DEFAULT 'secondary' CHECK (contact_type IN ('secondary', 'spouse', 'tenant', 'property_manager', 'emergency')),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_customer_contacts_customer ON public.crm_customer_contacts(customer_id) WHERE deleted_at IS NULL;

-- =============================================
-- 4. CRM INTERACTIONS - Communication Log
-- =============================================
CREATE TABLE public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'text', 'note', 'meeting', 'system')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  content TEXT,
  outcome TEXT,
  logged_by UUID,
  interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_interactions_customer ON public.crm_interactions(customer_id);
CREATE INDEX idx_crm_interactions_type ON public.crm_interactions(interaction_type);
CREATE INDEX idx_crm_interactions_date ON public.crm_interactions(interaction_at DESC);

-- =============================================
-- 5. CRM SUBMISSION LINKS - Maps submissions to customers
-- =============================================
CREATE TABLE public.crm_submission_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('ducted_estimate', 'ductless_estimate', 'equipment_scan', 'contact', 'landing_page')),
  submission_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_crm_submission_links_unique ON public.crm_submission_links(submission_type, submission_id);
CREATE INDEX idx_crm_submission_links_customer ON public.crm_submission_links(customer_id);

-- =============================================
-- 6. CRM PIPELINE STAGES - Configurable Stages
-- =============================================
CREATE TABLE public.crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_won_stage BOOLEAN DEFAULT false,
  is_lost_stage BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 7. CRM PIPELINE ENTRIES - Lead Pipeline Tracking
-- =============================================
CREATE TABLE public.crm_pipeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.crm_pipeline_stages(id),
  estimated_value DECIMAL(12, 2),
  expected_close_date DATE,
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  lost_reason TEXT,
  won_date TIMESTAMPTZ,
  lost_date TIMESTAMPTZ,
  notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_pipeline_entries_customer ON public.crm_pipeline_entries(customer_id);
CREATE INDEX idx_crm_pipeline_entries_stage ON public.crm_pipeline_entries(stage_id);

-- =============================================
-- TRIGGERS: Auto-update updated_at
-- =============================================
CREATE TRIGGER update_crm_customers_updated_at BEFORE UPDATE ON public.crm_customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crm_locations_updated_at BEFORE UPDATE ON public.crm_locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crm_customer_contacts_updated_at BEFORE UPDATE ON public.crm_customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crm_pipeline_stages_updated_at BEFORE UPDATE ON public.crm_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crm_pipeline_entries_updated_at BEFORE UPDATE ON public.crm_pipeline_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_submission_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_entries ENABLE ROW LEVEL SECURITY;

-- CRM Customers policies
CREATE POLICY "Authenticated users can view customers" ON public.crm_customers
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "Admins and managers can insert customers" ON public.crm_customers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can update customers" ON public.crm_customers
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete customers" ON public.crm_customers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CRM Locations policies
CREATE POLICY "Authenticated users can view locations" ON public.crm_locations
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "Admins and managers can insert locations" ON public.crm_locations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can update locations" ON public.crm_locations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete locations" ON public.crm_locations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CRM Customer Contacts policies
CREATE POLICY "Authenticated users can view contacts" ON public.crm_customer_contacts
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "Admins and managers can insert contacts" ON public.crm_customer_contacts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can update contacts" ON public.crm_customer_contacts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete contacts" ON public.crm_customer_contacts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CRM Interactions policies
CREATE POLICY "Authenticated users can view interactions" ON public.crm_interactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert interactions" ON public.crm_interactions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can update interactions" ON public.crm_interactions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete interactions" ON public.crm_interactions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CRM Submission Links policies
CREATE POLICY "Authenticated users can view submission links" ON public.crm_submission_links
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert submission links" ON public.crm_submission_links
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete submission links" ON public.crm_submission_links
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CRM Pipeline Stages policies
CREATE POLICY "Authenticated users can view pipeline stages" ON public.crm_pipeline_stages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage pipeline stages" ON public.crm_pipeline_stages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CRM Pipeline Entries policies
CREATE POLICY "Authenticated users can view pipeline entries" ON public.crm_pipeline_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert pipeline entries" ON public.crm_pipeline_entries
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can update pipeline entries" ON public.crm_pipeline_entries
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete pipeline entries" ON public.crm_pipeline_entries
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- INSERT DEFAULT PIPELINE STAGES
-- =============================================
INSERT INTO public.crm_pipeline_stages (name, display_name, color, sort_order, is_won_stage, is_lost_stage) VALUES
  ('new_lead', 'New Lead', '#3B82F6', 1, false, false),
  ('contacted', 'Contacted', '#8B5CF6', 2, false, false),
  ('estimate_scheduled', 'Estimate Scheduled', '#F59E0B', 3, false, false),
  ('proposal_sent', 'Proposal Sent', '#F97316', 4, false, false),
  ('negotiating', 'Negotiating', '#EC4899', 5, false, false),
  ('won', 'Won', '#10B981', 6, true, false),
  ('lost', 'Lost', '#EF4444', 7, false, true);