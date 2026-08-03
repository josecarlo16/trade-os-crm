-- Create calculator_configs table for storing different calculator types
CREATE TABLE public.calculator_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  calculator_type TEXT NOT NULL DEFAULT 'estimate',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calculator_options table for configurable options/factors
CREATE TABLE public.calculator_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calculator_id UUID NOT NULL REFERENCES public.calculator_configs(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  option_type TEXT NOT NULL DEFAULT 'select',
  label TEXT NOT NULL,
  help_text TEXT,
  options JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calculator_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_options ENABLE ROW LEVEL SECURITY;

-- Policies for calculator_configs (public read, authenticated write)
CREATE POLICY "Anyone can view active calculators" 
ON public.calculator_configs 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can view all calculators" 
ON public.calculator_configs 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert calculators" 
ON public.calculator_configs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update calculators" 
ON public.calculator_configs 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete calculators" 
ON public.calculator_configs 
FOR DELETE 
TO authenticated
USING (true);

-- Policies for calculator_options
CREATE POLICY "Anyone can view options for active calculators" 
ON public.calculator_options 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.calculator_configs 
  WHERE id = calculator_id AND is_active = true
));

CREATE POLICY "Authenticated users can view all options" 
ON public.calculator_options 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert options" 
ON public.calculator_options 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update options" 
ON public.calculator_options 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete options" 
ON public.calculator_options 
FOR DELETE 
TO authenticated
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_calculator_configs_updated_at
BEFORE UPDATE ON public.calculator_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calculator_options_updated_at
BEFORE UPDATE ON public.calculator_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_calculator_configs_slug ON public.calculator_configs(slug);
CREATE INDEX idx_calculator_options_calculator_id ON public.calculator_options(calculator_id);

-- Insert default HVAC estimate calculator
INSERT INTO public.calculator_configs (name, slug, description, calculator_type, config) 
VALUES (
  'HVAC Service Estimate',
  'hvac-estimate',
  'Get an instant estimate for HVAC services',
  'estimate',
  '{"base_price": 0, "currency": "USD", "disclaimer": "This is an estimate only. Final pricing may vary based on inspection."}'
);

-- Get the calculator ID and insert options
INSERT INTO public.calculator_options (calculator_id, option_name, option_type, label, help_text, options, sort_order, is_required)
SELECT 
  id,
  'service_type',
  'select',
  'Service Type',
  'Select the type of service you need',
  '[{"value": "repair", "label": "Repair", "price_modifier": 150}, {"value": "maintenance", "label": "Maintenance", "price_modifier": 99}, {"value": "installation", "label": "New Installation", "price_modifier": 0}, {"value": "replacement", "label": "System Replacement", "price_modifier": 0}]',
  1,
  true
FROM public.calculator_configs WHERE slug = 'hvac-estimate';

INSERT INTO public.calculator_options (calculator_id, option_name, option_type, label, help_text, options, sort_order, is_required)
SELECT 
  id,
  'home_size',
  'select',
  'Home Size (sq ft)',
  'Approximate square footage of your home',
  '[{"value": "small", "label": "Under 1,500 sq ft", "price_modifier": 0}, {"value": "medium", "label": "1,500 - 2,500 sq ft", "price_modifier": 500}, {"value": "large", "label": "2,500 - 3,500 sq ft", "price_modifier": 1000}, {"value": "xlarge", "label": "Over 3,500 sq ft", "price_modifier": 1500}]',
  2,
  true
FROM public.calculator_configs WHERE slug = 'hvac-estimate';

INSERT INTO public.calculator_options (calculator_id, option_name, option_type, label, help_text, options, sort_order, is_required)
SELECT 
  id,
  'system_type',
  'select',
  'System Type',
  'What type of HVAC system do you have or need?',
  '[{"value": "central_ac", "label": "Central AC", "price_modifier": 0}, {"value": "heat_pump", "label": "Heat Pump", "price_modifier": 500}, {"value": "mini_split", "label": "Mini-Split/Ductless", "price_modifier": 200}, {"value": "furnace", "label": "Furnace", "price_modifier": 300}]',
  3,
  true
FROM public.calculator_configs WHERE slug = 'hvac-estimate';

INSERT INTO public.calculator_options (calculator_id, option_name, option_type, label, help_text, options, sort_order, is_required)
SELECT 
  id,
  'urgency',
  'select',
  'Service Urgency',
  'How soon do you need service?',
  '[{"value": "standard", "label": "Standard (within 1 week)", "price_modifier": 0}, {"value": "priority", "label": "Priority (within 2-3 days)", "price_modifier": 50}, {"value": "emergency", "label": "Emergency (same day)", "price_modifier": 150}]',
  4,
  false
FROM public.calculator_configs WHERE slug = 'hvac-estimate';