-- =============================================
-- DUCTED HVAC ESTIMATOR - DATABASE SCHEMA
-- =============================================

-- 1. Efficiency Tiers Table
CREATE TABLE public.ducted_efficiency_tiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    seer_min NUMERIC NOT NULL,
    seer_max NUMERIC NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ducted_efficiency_tiers ENABLE ROW LEVEL SECURITY;

-- Policies for efficiency tiers
CREATE POLICY "Anyone can view active ducted efficiency tiers"
ON public.ducted_efficiency_tiers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can view all ducted efficiency tiers"
ON public.ducted_efficiency_tiers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage ducted efficiency tiers"
ON public.ducted_efficiency_tiers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Ducted Equipment Table
CREATE TABLE public.ducted_equipment (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    brand TEXT NOT NULL,
    model_number TEXT,
    tonnage NUMERIC NOT NULL,
    system_type TEXT NOT NULL CHECK (system_type IN ('heat_pump', 'gas_system')),
    efficiency_tier_id UUID REFERENCES public.ducted_efficiency_tiers(id) ON DELETE SET NULL,
    seer_rating NUMERIC NOT NULL,
    hspf_rating NUMERIC,
    afue_rating NUMERIC,
    equipment_cost NUMERIC NOT NULL DEFAULT 0,
    installation_labor NUMERIC NOT NULL DEFAULT 0,
    is_energy_star BOOLEAN NOT NULL DEFAULT false,
    warranty_years INTEGER NOT NULL DEFAULT 10,
    features JSONB DEFAULT '[]'::jsonb,
    is_best_value BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ducted_equipment ENABLE ROW LEVEL SECURITY;

-- Policies for equipment
CREATE POLICY "Anyone can view active ducted equipment"
ON public.ducted_equipment
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can view all ducted equipment"
ON public.ducted_equipment
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage ducted equipment"
ON public.ducted_equipment
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Tonnage Sizing Rules Table
CREATE TABLE public.ducted_tonnage_sizing_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    home_type TEXT NOT NULL,
    layout TEXT NOT NULL,
    sq_ft_min INTEGER NOT NULL,
    sq_ft_max INTEGER NOT NULL,
    recommended_tonnage NUMERIC NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ducted_tonnage_sizing_rules ENABLE ROW LEVEL SECURITY;

-- Policies for tonnage rules
CREATE POLICY "Anyone can view active ducted tonnage rules"
ON public.ducted_tonnage_sizing_rules
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can view all ducted tonnage rules"
ON public.ducted_tonnage_sizing_rules
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage ducted tonnage rules"
ON public.ducted_tonnage_sizing_rules
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Pricing Modifiers Table
CREATE TABLE public.ducted_pricing_modifiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    modifier_type TEXT NOT NULL CHECK (modifier_type IN ('add_on', 'adjustment', 'discount', 'surcharge')),
    amount NUMERIC DEFAULT 0,
    percentage NUMERIC DEFAULT 0,
    calculation_base TEXT DEFAULT 'total' CHECK (calculation_base IN ('equipment', 'labor', 'total')),
    conditions JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ducted_pricing_modifiers ENABLE ROW LEVEL SECURITY;

-- Policies for pricing modifiers
CREATE POLICY "Anyone can view active ducted pricing modifiers"
ON public.ducted_pricing_modifiers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can view all ducted pricing modifiers"
ON public.ducted_pricing_modifiers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage ducted pricing modifiers"
ON public.ducted_pricing_modifiers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Add-ons Table
CREATE TABLE public.ducted_addons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    icon_name TEXT,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ducted_addons ENABLE ROW LEVEL SECURITY;

-- Policies for add-ons
CREATE POLICY "Anyone can view active ducted addons"
ON public.ducted_addons
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can view all ducted addons"
ON public.ducted_addons
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage ducted addons"
ON public.ducted_addons
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Estimate Submissions Table
CREATE TABLE public.ducted_estimate_submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Customer Info
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    best_time_to_call TEXT CHECK (best_time_to_call IN ('morning', 'afternoon', 'evening')),
    wants_backup_quote BOOLEAN DEFAULT false,
    -- Home Selections
    home_type TEXT NOT NULL,
    home_layout TEXT NOT NULL,
    system_count INTEGER NOT NULL DEFAULT 1,
    coverage TEXT NOT NULL CHECK (coverage IN ('entire_home', 'partial_home')),
    square_footage TEXT NOT NULL,
    -- Usage Patterns
    hot_cold_spots TEXT CHECK (hot_cold_spots IN ('none', 'some', 'too_many')),
    winter_temp TEXT,
    summer_temp TEXT,
    -- System Selection
    heating_type TEXT NOT NULL CHECK (heating_type IN ('heat_pump', 'gas_system')),
    efficiency_tier_id UUID REFERENCES public.ducted_efficiency_tiers(id) ON DELETE SET NULL,
    recommended_tonnage NUMERIC,
    equipment_id UUID REFERENCES public.ducted_equipment(id) ON DELETE SET NULL,
    -- Add-ons
    selected_addons JSONB DEFAULT '[]'::jsonb,
    -- Pricing
    equipment_cost NUMERIC DEFAULT 0,
    installation_cost NUMERIC DEFAULT 0,
    addons_cost NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    final_total NUMERIC DEFAULT 0,
    -- Status & Integration
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'quoted', 'converted', 'lost')),
    ghl_contact_id TEXT,
    notes TEXT,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ducted_estimate_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for submissions
CREATE POLICY "Anyone can submit ducted estimates"
ON public.ducted_estimate_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can view ducted submissions"
ON public.ducted_estimate_submissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update ducted submissions"
ON public.ducted_estimate_submissions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can delete ducted submissions"
ON public.ducted_estimate_submissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Efficiency Tiers
INSERT INTO public.ducted_efficiency_tiers (name, display_name, seer_min, seer_max, description, features, sort_order) VALUES
('efficient', 'Efficient', 15, 17, 'Reliable performance with standard efficiency ratings. Great value for budget-conscious homeowners.', '["Meets DOE 2023 standards", "Standard compressor technology", "10-year parts warranty"]', 1),
('efficiency_plus', 'Efficiency+', 16, 18, 'Enhanced efficiency with better comfort control. Ideal balance of performance and value.', '["Variable-speed blower", "Improved humidity control", "Quieter operation", "10-year parts warranty"]', 2),
('premium', 'Premium', 18, 22, 'Top-tier efficiency with advanced features. Maximum comfort and lowest operating costs.', '["Inverter technology", "Variable-speed compressor", "Smart diagnostics", "Ultra-quiet operation", "12-year parts warranty"]', 3);

-- Tonnage Sizing Rules (Texas DFW climate - hot summers)
INSERT INTO public.ducted_tonnage_sizing_rules (home_type, layout, sq_ft_min, sq_ft_max, recommended_tonnage, notes) VALUES
-- Single Family 1 Story
('single_family', '1_story', 0, 800, 1.5, 'Small single story home'),
('single_family', '1_story', 801, 1200, 2.0, 'Standard small single story'),
('single_family', '1_story', 1201, 1600, 2.5, 'Medium single story'),
('single_family', '1_story', 1601, 2000, 3.0, 'Standard single story'),
('single_family', '1_story', 2001, 2500, 3.5, 'Large single story'),
('single_family', '1_story', 2501, 3500, 4.0, 'Very large single story'),
('single_family', '1_story', 3501, 9999, 5.0, 'Extra large single story'),
-- Single Family 2 Story
('single_family', '2_stories', 0, 1200, 2.0, 'Small two story home'),
('single_family', '2_stories', 1201, 1600, 2.5, 'Standard small two story'),
('single_family', '2_stories', 1601, 2000, 3.0, 'Medium two story'),
('single_family', '2_stories', 2001, 2500, 3.5, 'Standard two story'),
('single_family', '2_stories', 2501, 3500, 4.0, 'Large two story'),
('single_family', '2_stories', 3501, 9999, 5.0, 'Very large two story'),
-- Townhouse
('townhouse', '2_stories', 0, 1000, 1.5, 'Small townhouse'),
('townhouse', '2_stories', 1001, 1500, 2.0, 'Standard townhouse'),
('townhouse', '2_stories', 1501, 2000, 2.5, 'Large townhouse'),
('townhouse', '2_stories', 2001, 9999, 3.0, 'Extra large townhouse'),
('townhouse', '3_stories', 0, 1500, 2.0, 'Small 3-story townhouse'),
('townhouse', '3_stories', 1501, 2500, 2.5, 'Standard 3-story townhouse'),
('townhouse', '3_stories', 2501, 9999, 3.0, 'Large 3-story townhouse'),
-- Condo
('condo', '1_story', 0, 800, 1.5, 'Small condo'),
('condo', '1_story', 801, 1200, 2.0, 'Standard condo'),
('condo', '1_story', 1201, 9999, 2.5, 'Large condo'),
-- Mobile Home
('mobile_home', '1_story', 0, 1000, 1.5, 'Single wide'),
('mobile_home', '1_story', 1001, 1600, 2.0, 'Double wide'),
('mobile_home', '1_story', 1601, 9999, 2.5, 'Large mobile home');

-- Ducted Equipment - Heat Pumps
INSERT INTO public.ducted_equipment (brand, model_number, tonnage, system_type, efficiency_tier_id, seer_rating, hspf_rating, equipment_cost, installation_labor, is_energy_star, warranty_years, features, is_best_value, display_order) VALUES
-- Efficient Tier Heat Pumps
('Goodman', 'GSZH501810', 1.5, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.2, 8.5, 3200, 2800, true, 10, '["Single-stage compressor", "R-410A refrigerant", "Factory-installed filter drier"]', false, 1),
('Goodman', 'GSZH502410', 2.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.2, 8.5, 3400, 2900, true, 10, '["Single-stage compressor", "R-410A refrigerant", "Factory-installed filter drier"]', false, 2),
('Goodman', 'GSZH503010', 2.5, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.2, 8.5, 3600, 3000, true, 10, '["Single-stage compressor", "R-410A refrigerant", "Factory-installed filter drier"]', false, 3),
('Goodman', 'GSZH503610', 3.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.2, 8.5, 3900, 3100, true, 10, '["Single-stage compressor", "R-410A refrigerant", "Factory-installed filter drier"]', false, 4),
('Goodman', 'GSZH504210', 3.5, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.2, 8.5, 4200, 3200, true, 10, '["Single-stage compressor", "R-410A refrigerant", "Factory-installed filter drier"]', false, 5),
('Goodman', 'GSZH504810', 4.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.2, 8.5, 4500, 3300, true, 10, '["Single-stage compressor", "R-410A refrigerant", "Factory-installed filter drier"]', false, 6),
('Goodman', 'GSZH506010', 5.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.2, 8.5, 5200, 3500, true, 10, '["Single-stage compressor", "R-410A refrigerant", "Factory-installed filter drier"]', false, 7),
-- Efficiency+ Tier Heat Pumps
('Carrier', '25VNA018A003', 1.5, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 9.5, 4800, 3200, true, 10, '["Two-stage compressor", "WeatherArmor protection", "Silencer System II"]', false, 10),
('Carrier', '25VNA024A003', 2.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 9.5, 5100, 3300, true, 10, '["Two-stage compressor", "WeatherArmor protection", "Silencer System II"]', true, 11),
('Carrier', '25VNA030A003', 2.5, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 9.5, 5400, 3400, true, 10, '["Two-stage compressor", "WeatherArmor protection", "Silencer System II"]', true, 12),
('Carrier', '25VNA036A003', 3.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 9.5, 5800, 3500, true, 10, '["Two-stage compressor", "WeatherArmor protection", "Silencer System II"]', true, 13),
('Carrier', '25VNA042A003', 3.5, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 9.5, 6200, 3600, true, 10, '["Two-stage compressor", "WeatherArmor protection", "Silencer System II"]', false, 14),
('Carrier', '25VNA048A003', 4.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 9.5, 6600, 3700, true, 10, '["Two-stage compressor", "WeatherArmor protection", "Silencer System II"]', false, 15),
('Carrier', '25VNA060A003', 5.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 9.5, 7400, 3900, true, 10, '["Two-stage compressor", "WeatherArmor protection", "Silencer System II"]', false, 16),
-- Premium Tier Heat Pumps
('Mitsubishi', 'SVZ-KP18NA', 1.5, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 20.0, 10.0, 6500, 3800, true, 12, '["Inverter-driven compressor", "Hyper-Heating PLUS", "All-climate performance", "Whisper-quiet operation"]', false, 20),
('Mitsubishi', 'SVZ-KP24NA', 2.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 20.0, 10.0, 7000, 3900, true, 12, '["Inverter-driven compressor", "Hyper-Heating PLUS", "All-climate performance", "Whisper-quiet operation"]', false, 21),
('Mitsubishi', 'SVZ-KP30NA', 2.5, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 20.0, 10.0, 7500, 4000, true, 12, '["Inverter-driven compressor", "Hyper-Heating PLUS", "All-climate performance", "Whisper-quiet operation"]', false, 22),
('Mitsubishi', 'SVZ-KP36NA', 3.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 20.0, 10.0, 8200, 4100, true, 12, '["Inverter-driven compressor", "Hyper-Heating PLUS", "All-climate performance", "Whisper-quiet operation"]', false, 23),
('Mitsubishi', 'SVZ-KP42NA', 3.5, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 20.0, 10.0, 8800, 4200, true, 12, '["Inverter-driven compressor", "Hyper-Heating PLUS", "All-climate performance", "Whisper-quiet operation"]', false, 24),
('Mitsubishi', 'SVZ-KP48NA', 4.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 20.0, 10.0, 9500, 4300, true, 12, '["Inverter-driven compressor", "Hyper-Heating PLUS", "All-climate performance", "Whisper-quiet operation"]', false, 25),
('Mitsubishi', 'SVZ-KP60NA', 5.0, 'heat_pump', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 20.0, 10.0, 10800, 4500, true, 12, '["Inverter-driven compressor", "Hyper-Heating PLUS", "All-climate performance", "Whisper-quiet operation"]', false, 26);

-- Ducted Equipment - Gas Systems (AC + Furnace)
INSERT INTO public.ducted_equipment (brand, model_number, tonnage, system_type, efficiency_tier_id, seer_rating, afue_rating, equipment_cost, installation_labor, is_energy_star, warranty_years, features, is_best_value, display_order) VALUES
-- Efficient Tier Gas Systems
('Goodman', 'GSXC180181/GMEC960803BN', 1.5, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.0, 96, 4200, 3200, true, 10, '["80% AFUE furnace", "Single-stage cooling", "Multi-speed blower"]', false, 30),
('Goodman', 'GSXC180241/GMEC960803BN', 2.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.0, 96, 4500, 3300, true, 10, '["96% AFUE furnace", "Single-stage cooling", "Multi-speed blower"]', false, 31),
('Goodman', 'GSXC180301/GMEC960804CN', 2.5, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.0, 96, 4800, 3400, true, 10, '["96% AFUE furnace", "Single-stage cooling", "Multi-speed blower"]', false, 32),
('Goodman', 'GSXC180361/GMEC961004CN', 3.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.0, 96, 5200, 3500, true, 10, '["96% AFUE furnace", "Single-stage cooling", "Multi-speed blower"]', false, 33),
('Goodman', 'GSXC180421/GMEC961004CN', 3.5, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.0, 96, 5600, 3600, true, 10, '["96% AFUE furnace", "Single-stage cooling", "Multi-speed blower"]', false, 34),
('Goodman', 'GSXC180481/GMEC961205DN', 4.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.0, 96, 6000, 3700, true, 10, '["96% AFUE furnace", "Single-stage cooling", "Multi-speed blower"]', false, 35),
('Goodman', 'GSXC180601/GMEC961205DN', 5.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficient'), 15.0, 96, 6800, 3900, true, 10, '["96% AFUE furnace", "Single-stage cooling", "Multi-speed blower"]', false, 36),
-- Efficiency+ Tier Gas Systems
('Carrier', '24ACC618A003/59TP5A080E17', 1.5, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 95, 5800, 3600, true, 10, '["95% AFUE modulating furnace", "Two-stage cooling", "Variable-speed blower"]', false, 40),
('Carrier', '24ACC624A003/59TP5A080E17', 2.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 95, 6200, 3700, true, 10, '["95% AFUE modulating furnace", "Two-stage cooling", "Variable-speed blower"]', true, 41),
('Carrier', '24ACC630A003/59TP5A100E21', 2.5, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 95, 6600, 3800, true, 10, '["95% AFUE modulating furnace", "Two-stage cooling", "Variable-speed blower"]', true, 42),
('Carrier', '24ACC636A003/59TP5A100E21', 3.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 95, 7100, 3900, true, 10, '["95% AFUE modulating furnace", "Two-stage cooling", "Variable-speed blower"]', true, 43),
('Carrier', '24ACC642A003/59TP5A120E21', 3.5, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 95, 7600, 4000, true, 10, '["95% AFUE modulating furnace", "Two-stage cooling", "Variable-speed blower"]', false, 44),
('Carrier', '24ACC648A003/59TP5A120E21', 4.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 95, 8100, 4100, true, 10, '["95% AFUE modulating furnace", "Two-stage cooling", "Variable-speed blower"]', false, 45),
('Carrier', '24ACC660A003/59TP5A140E24', 5.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'efficiency_plus'), 17.0, 95, 9100, 4300, true, 10, '["95% AFUE modulating furnace", "Two-stage cooling", "Variable-speed blower"]', false, 46),
-- Premium Tier Gas Systems
('Lennox', 'XC21/SL297NV', 1.5, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 21.0, 97, 8200, 4200, true, 12, '["97% AFUE modulating furnace", "Variable-speed compressor", "SilentComfort technology", "iComfort compatible"]', false, 50),
('Lennox', 'XC21/SL297NV', 2.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 21.0, 97, 8800, 4300, true, 12, '["97% AFUE modulating furnace", "Variable-speed compressor", "SilentComfort technology", "iComfort compatible"]', false, 51),
('Lennox', 'XC21/SL297NV', 2.5, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 21.0, 97, 9400, 4400, true, 12, '["97% AFUE modulating furnace", "Variable-speed compressor", "SilentComfort technology", "iComfort compatible"]', false, 52),
('Lennox', 'XC21/SL297NV', 3.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 21.0, 97, 10200, 4500, true, 12, '["97% AFUE modulating furnace", "Variable-speed compressor", "SilentComfort technology", "iComfort compatible"]', false, 53),
('Lennox', 'XC21/SL297NV', 3.5, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 21.0, 97, 11000, 4600, true, 12, '["97% AFUE modulating furnace", "Variable-speed compressor", "SilentComfort technology", "iComfort compatible"]', false, 54),
('Lennox', 'XC21/SL297NV', 4.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 21.0, 97, 11800, 4700, true, 12, '["97% AFUE modulating furnace", "Variable-speed compressor", "SilentComfort technology", "iComfort compatible"]', false, 55),
('Lennox', 'XC21/SL297NV', 5.0, 'gas_system', (SELECT id FROM public.ducted_efficiency_tiers WHERE name = 'premium'), 21.0, 97, 13400, 4900, true, 12, '["97% AFUE modulating furnace", "Variable-speed compressor", "SilentComfort technology", "iComfort compatible"]', false, 56);

-- Add-ons
INSERT INTO public.ducted_addons (name, description, price, icon_name, is_popular, sort_order) VALUES
('Smart Thermostat', 'Wi-Fi enabled programmable thermostat with app control and energy reports', 450, 'Thermometer', true, 1),
('UV Air Purifier', 'Germicidal UV light kills bacteria, viruses, and mold in your ductwork', 650, 'Sun', true, 2),
('Whole-Home Humidifier', 'Maintains optimal humidity levels for comfort and health', 550, 'Droplets', false, 3),
('Zoning System', 'Control temperatures independently in different areas of your home', 1800, 'LayoutGrid', false, 4),
('High-Efficiency Filter Cabinet', 'MERV-16 filtration for superior indoor air quality', 450, 'Wind', false, 5),
('Surge Protector', 'Protects your HVAC investment from electrical surges', 295, 'Zap', false, 6),
('Duct Sealing', 'Seal existing ductwork to prevent energy loss and improve efficiency', 800, 'Package', false, 7),
('10-Year Labor Warranty', 'Extended labor warranty coverage beyond standard manufacturer warranty', 495, 'Shield', true, 8);

-- Pricing Modifiers
INSERT INTO public.ducted_pricing_modifiers (name, modifier_type, amount, percentage, calculation_base, description, sort_order) VALUES
('Standard Installation', 'adjustment', 0, 0, 'total', 'Standard ground-level installation with existing ductwork', 1),
('Attic Installation', 'surcharge', 500, 0, 'labor', 'Additional labor for attic equipment placement', 2),
('Rooftop Installation', 'surcharge', 800, 0, 'labor', 'Additional labor for rooftop package unit installation', 3),
('Crawl Space Access', 'surcharge', 400, 0, 'labor', 'Limited access crawl space installation', 4),
('Ductwork Modification', 'add_on', 1200, 0, 'total', 'Modify existing ductwork for new equipment', 5),
('New Electrical Circuit', 'add_on', 450, 0, 'total', 'New dedicated electrical circuit required', 6),
('Gas Line Extension', 'add_on', 650, 0, 'total', 'Extend gas line to new equipment location', 7),
('Permit Fee', 'add_on', 350, 0, 'total', 'City/county permit and inspection fees', 8),
('Senior Discount', 'discount', 0, 5, 'total', '5% discount for customers 65 and older', 10),
('Military/First Responder', 'discount', 0, 5, 'total', '5% discount for military and first responders', 11);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_ducted_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_ducted_efficiency_tiers_updated_at
    BEFORE UPDATE ON public.ducted_efficiency_tiers
    FOR EACH ROW EXECUTE FUNCTION public.update_ducted_updated_at();

CREATE TRIGGER update_ducted_equipment_updated_at
    BEFORE UPDATE ON public.ducted_equipment
    FOR EACH ROW EXECUTE FUNCTION public.update_ducted_updated_at();

CREATE TRIGGER update_ducted_tonnage_sizing_rules_updated_at
    BEFORE UPDATE ON public.ducted_tonnage_sizing_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_ducted_updated_at();

CREATE TRIGGER update_ducted_pricing_modifiers_updated_at
    BEFORE UPDATE ON public.ducted_pricing_modifiers
    FOR EACH ROW EXECUTE FUNCTION public.update_ducted_updated_at();

CREATE TRIGGER update_ducted_addons_updated_at
    BEFORE UPDATE ON public.ducted_addons
    FOR EACH ROW EXECUTE FUNCTION public.update_ducted_updated_at();

CREATE TRIGGER update_ducted_estimate_submissions_updated_at
    BEFORE UPDATE ON public.ducted_estimate_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_ducted_updated_at();