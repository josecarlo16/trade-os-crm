-- =====================================================
-- Phase 1: Project Estimator Foundation
-- Materials Catalog, Labor Rates, Admin Costs
-- =====================================================

-- Create materials category enum
CREATE TYPE public.material_category AS ENUM (
  'refrigerant',
  'copper',
  'electrical',
  'ductwork',
  'controls',
  'supports',
  'misc'
);

-- Create labor rate type enum
CREATE TYPE public.labor_rate_type AS ENUM (
  'hourly',
  'daily',
  'flat'
);

-- Create admin cost type enum
CREATE TYPE public.admin_cost_type AS ENUM (
  'fixed',
  'percentage',
  'per_job'
);

-- =====================================================
-- MATERIALS CATALOG TABLE
-- =====================================================
CREATE TABLE public.materials_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category material_category NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  supplier TEXT,
  part_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.materials_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only write, authenticated read
CREATE POLICY "Admins can manage materials"
  ON public.materials_catalog
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view materials"
  ON public.materials_catalog
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for category filtering
CREATE INDEX idx_materials_category ON public.materials_catalog(category);
CREATE INDEX idx_materials_active ON public.materials_catalog(is_active);

-- =====================================================
-- LABOR RATES TABLE
-- =====================================================
CREATE TABLE public.labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate_type labor_rate_type NOT NULL DEFAULT 'hourly',
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.labor_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only write, authenticated read
CREATE POLICY "Admins can manage labor rates"
  ON public.labor_rates
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view labor rates"
  ON public.labor_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- ADMIN COSTS TABLE
-- =====================================================
CREATE TABLE public.admin_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cost_type admin_cost_type NOT NULL DEFAULT 'fixed',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only write, authenticated read
CREATE POLICY "Admins can manage admin costs"
  ON public.admin_costs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view admin costs"
  ON public.admin_costs
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER update_materials_catalog_updated_at
  BEFORE UPDATE ON public.materials_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_labor_rates_updated_at
  BEFORE UPDATE ON public.labor_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_costs_updated_at
  BEFORE UPDATE ON public.admin_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SEED DATA: MATERIALS CATALOG
-- =====================================================

-- Refrigerant
INSERT INTO public.materials_catalog (name, category, unit, unit_cost, description) VALUES
  ('R-410A Refrigerant', 'refrigerant', 'lb', 15.00, 'Standard refrigerant for modern systems'),
  ('R-22 Refrigerant', 'refrigerant', 'lb', 75.00, 'Legacy refrigerant (phased out)');

-- Copper
INSERT INTO public.materials_catalog (name, category, unit, unit_cost, description) VALUES
  ('1/4" Copper Line', 'copper', 'ft', 2.50, 'Small liquid line'),
  ('3/8" Copper Line', 'copper', 'ft', 3.25, 'Medium liquid/suction line'),
  ('1/2" Copper Line', 'copper', 'ft', 4.00, 'Suction line'),
  ('5/8" Copper Line', 'copper', 'ft', 5.50, 'Large suction line'),
  ('3/4" Copper Line', 'copper', 'ft', 7.00, 'Extra large suction line'),
  ('7/8" Copper Line', 'copper', 'ft', 8.50, 'Commercial suction line'),
  ('1-1/8" Copper Line', 'copper', 'ft', 12.00, 'Large commercial line');

-- Electrical
INSERT INTO public.materials_catalog (name, category, unit, unit_cost, description) VALUES
  ('10/2 Wire', 'electrical', 'ft', 1.75, 'Standard 30A circuit wire'),
  ('10/3 Wire', 'electrical', 'ft', 2.25, 'Standard with ground'),
  ('8/2 Wire', 'electrical', 'ft', 2.50, '40A circuit wire'),
  ('6/2 Wire', 'electrical', 'ft', 3.50, '50A circuit wire'),
  ('18/5 Thermostat Wire', 'electrical', 'ft', 0.45, '5-conductor thermostat cable'),
  ('18/8 Thermostat Wire', 'electrical', 'ft', 0.65, '8-conductor thermostat cable'),
  ('Disconnect 30A', 'electrical', 'each', 25.00, '30 Amp non-fused disconnect'),
  ('Disconnect 60A', 'electrical', 'each', 35.00, '60 Amp non-fused disconnect'),
  ('Whip 1/2" x 6ft', 'electrical', 'each', 18.00, 'Flexible conduit with wire');

-- Ductwork
INSERT INTO public.materials_catalog (name, category, unit, unit_cost, description) VALUES
  ('6" Flex Duct', 'ductwork', 'ft', 3.50, '6 inch insulated flex'),
  ('7" Flex Duct', 'ductwork', 'ft', 4.00, '7 inch insulated flex'),
  ('8" Flex Duct', 'ductwork', 'ft', 4.50, '8 inch insulated flex'),
  ('10" Flex Duct', 'ductwork', 'ft', 5.50, '10 inch insulated flex'),
  ('12" Flex Duct', 'ductwork', 'ft', 6.50, '12 inch insulated flex'),
  ('14" Flex Duct', 'ductwork', 'ft', 8.00, '14 inch insulated flex'),
  ('Plenum Box', 'ductwork', 'each', 85.00, 'Supply plenum box'),
  ('Return Box', 'ductwork', 'each', 75.00, 'Return air box');

-- Controls
INSERT INTO public.materials_catalog (name, category, unit, unit_cost, description) VALUES
  ('Basic Thermostat', 'controls', 'each', 45.00, 'Non-programmable thermostat'),
  ('Programmable Thermostat', 'controls', 'each', 85.00, '7-day programmable'),
  ('WiFi Thermostat', 'controls', 'each', 150.00, 'Smart WiFi thermostat'),
  ('Ecobee Smart Thermostat', 'controls', 'each', 220.00, 'Premium smart thermostat');

-- Supports
INSERT INTO public.materials_catalog (name, category, unit, unit_cost, description) VALUES
  ('Condenser Pad', 'supports', 'each', 45.00, 'Composite equipment pad'),
  ('Roof Curb', 'supports', 'each', 250.00, 'Commercial roof curb'),
  ('Vibration Isolators', 'supports', 'set', 35.00, 'Set of 4 isolator pads'),
  ('Line Hide Cover', 'supports', 'ft', 12.00, 'Decorative line set cover');

-- Misc
INSERT INTO public.materials_catalog (name, category, unit, unit_cost, description) VALUES
  ('Drain Line 3/4" PVC', 'misc', 'ft', 1.25, 'Condensate drain line'),
  ('Condensate Pump', 'misc', 'each', 65.00, 'Mini condensate pump'),
  ('Float Switch', 'misc', 'each', 18.00, 'Safety float switch'),
  ('Duct Tape (Roll)', 'misc', 'each', 12.00, 'Foil duct tape'),
  ('Mastic (Gallon)', 'misc', 'each', 28.00, 'Duct sealant');

-- =====================================================
-- SEED DATA: LABOR RATES
-- =====================================================
INSERT INTO public.labor_rates (name, rate_type, rate, description) VALUES
  ('Install Crew (Flat Rate)', 'flat', 3100.00, 'Standard 2-person install crew for full day'),
  ('Lead Technician (Hourly)', 'hourly', 45.00, 'Senior technician hourly rate'),
  ('Technician (Hourly)', 'hourly', 32.00, 'Standard technician hourly rate'),
  ('Technician (Daily)', 'daily', 256.00, 'Standard technician 8-hour day rate'),
  ('Helper (Hourly)', 'hourly', 22.00, 'Helper/apprentice hourly rate');

-- =====================================================
-- SEED DATA: ADMIN COSTS
-- =====================================================
INSERT INTO public.admin_costs (name, cost_type, amount, description, is_required) VALUES
  ('General Liability Insurance', 'fixed', 300.00, 'Job insurance coverage', true),
  ('Permit Fee', 'fixed', 150.00, 'City/county permit fee', true),
  ('Sales Commission', 'percentage', 5.00, 'Sales rep commission (5% of total)', false),
  ('Warranty Reserve', 'fixed', 100.00, 'Warranty fund allocation', false),
  ('Vehicle/Fuel', 'fixed', 75.00, 'Job transportation cost', false);