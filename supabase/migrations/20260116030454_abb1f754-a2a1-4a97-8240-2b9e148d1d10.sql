-- Create estimate templates table
CREATE TABLE public.estimate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  job_type job_type NOT NULL DEFAULT 'residential_replacement',
  heating_type heating_type NOT NULL DEFAULT 'gas',
  profit_margin NUMERIC(5,2) NOT NULL DEFAULT 1.60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create estimate template items table
CREATE TABLE public.estimate_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.estimate_templates(id) ON DELETE CASCADE,
  item_type line_item_type NOT NULL DEFAULT 'material',
  name TEXT NOT NULL,
  description TEXT,
  material_id UUID REFERENCES public.materials_catalog(id) ON DELETE SET NULL,
  labor_rate_id UUID REFERENCES public.labor_rates(id) ON DELETE SET NULL,
  admin_cost_id UUID REFERENCES public.admin_costs(id) ON DELETE SET NULL,
  equipment_system_id UUID REFERENCES public.equipment_systems(id) ON DELETE SET NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for estimate_templates
CREATE POLICY "Admins can view estimate templates"
  ON public.estimate_templates
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create estimate templates"
  ON public.estimate_templates
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update estimate templates"
  ON public.estimate_templates
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete estimate templates"
  ON public.estimate_templates
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for estimate_template_items
CREATE POLICY "Admins can view template items"
  ON public.estimate_template_items
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create template items"
  ON public.estimate_template_items
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update template items"
  ON public.estimate_template_items
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete template items"
  ON public.estimate_template_items
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_estimate_templates_updated_at
  BEFORE UPDATE ON public.estimate_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimate_template_items_updated_at
  BEFORE UPDATE ON public.estimate_template_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with common job templates
INSERT INTO public.estimate_templates (name, description, job_type, heating_type, profit_margin, sort_order) VALUES
  ('Attic Install - Gas', 'Standard attic HVAC system installation with gas furnace', 'residential_new', 'gas', 1.65, 1),
  ('Attic Install - Heat Pump', 'Standard attic HVAC system installation with heat pump', 'residential_new', 'heat_pump', 1.65, 2),
  ('Closet Install - Gas', 'Standard closet/indoor HVAC system installation with gas furnace', 'residential_new', 'gas', 1.60, 3),
  ('Closet Install - Electric', 'Standard closet/indoor HVAC system installation with electric heat', 'residential_new', 'electric', 1.60, 4),
  ('System Replacement - Standard', 'Standard residential system replacement', 'residential_replacement', 'gas', 1.55, 5),
  ('System Replacement - Premium', 'Premium residential system replacement with upgrades', 'residential_replacement', 'dual_fuel', 1.70, 6);