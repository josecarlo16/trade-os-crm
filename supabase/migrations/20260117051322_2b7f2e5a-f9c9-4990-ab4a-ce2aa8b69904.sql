-- =============================================
-- DUCTLESS ESTIMATOR CONFIGURATION TABLES
-- =============================================

-- Table 1: ductless_unit_types (Indoor unit styles)
CREATE TABLE public.ductless_unit_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  benefits JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table 2: ductless_system_tiers (M-Series, P-Series, S-Series)
CREATE TABLE public.ductless_system_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  tier_level TEXT NOT NULL CHECK (tier_level IN ('good', 'better', 'best')),
  description TEXT,
  price_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  features JSONB DEFAULT '[]'::jsonb,
  seer_rating NUMERIC,
  warranty_years INTEGER NOT NULL DEFAULT 5,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table 3: ductless_addons (Optional add-ons)
CREATE TABLE public.ductless_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'per_zone')),
  icon_name TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table 4: ductless_estimate_submissions (Customer submissions)
CREATE TABLE public.ductless_estimate_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  selected_rooms JSONB DEFAULT '[]'::jsonb,
  unit_type_id UUID REFERENCES public.ductless_unit_types(id),
  system_tier_id UUID REFERENCES public.ductless_system_tiers(id),
  selected_addons JSONB DEFAULT '[]'::jsonb,
  zone_count INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  rebates NUMERIC NOT NULL DEFAULT 0,
  final_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'converted', 'closed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.ductless_unit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ductless_system_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ductless_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ductless_estimate_submissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR ductless_unit_types
-- =============================================

CREATE POLICY "Public can view active unit types"
ON public.ductless_unit_types
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage unit types"
ON public.ductless_unit_types
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- =============================================
-- RLS POLICIES FOR ductless_system_tiers
-- =============================================

CREATE POLICY "Public can view active system tiers"
ON public.ductless_system_tiers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage system tiers"
ON public.ductless_system_tiers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- =============================================
-- RLS POLICIES FOR ductless_addons
-- =============================================

CREATE POLICY "Public can view active addons"
ON public.ductless_addons
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage addons"
ON public.ductless_addons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- =============================================
-- RLS POLICIES FOR ductless_estimate_submissions
-- =============================================

CREATE POLICY "Anyone can submit estimates"
ON public.ductless_estimate_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage submissions"
ON public.ductless_estimate_submissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

CREATE TRIGGER update_ductless_unit_types_updated_at
BEFORE UPDATE ON public.ductless_unit_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ductless_system_tiers_updated_at
BEFORE UPDATE ON public.ductless_system_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ductless_addons_updated_at
BEFORE UPDATE ON public.ductless_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ductless_estimate_submissions_updated_at
BEFORE UPDATE ON public.ductless_estimate_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEED DATA: Unit Types
-- =============================================

INSERT INTO public.ductless_unit_types (name, display_name, description, base_price, benefits, sort_order) VALUES
('wall_mount', 'Wall Mount', 'Classic wall-mounted indoor unit - the most popular choice for bedrooms and living areas', 2800, '["Most affordable option", "Easy installation", "Ideal for most rooms", "Quiet operation"]'::jsonb, 1),
('1way_cassette', '1-Way Cassette', 'Recessed ceiling mount with single-direction airflow - sleek and unobtrusive', 3200, '["Ceiling recessed design", "Discreet appearance", "Great for narrow rooms", "Professional look"]'::jsonb, 2),
('4way_cassette', '4-Way Cassette', 'Recessed ceiling mount with 360-degree airflow - perfect for open floor plans', 3800, '["360° air distribution", "Ideal for large open spaces", "Maximum coverage", "Commercial-grade quality"]'::jsonb, 3),
('floor_mount', 'Floor Mount', 'Low-profile floor installation - great for rooms with limited wall space', 2950, '["Easy access for maintenance", "Ideal for attic rooms", "Good for sloped ceilings", "Direct heating at floor level"]'::jsonb, 4);

-- =============================================
-- SEED DATA: System Tiers
-- =============================================

INSERT INTO public.ductless_system_tiers (name, display_name, tier_level, description, price_multiplier, features, seer_rating, warranty_years, is_featured, sort_order) VALUES
('m_series', 'M-Series Standard', 'good', 'Reliable comfort with proven Mitsubishi technology', 1.0, '["Up to 18 SEER efficiency", "Whisper-quiet operation", "Wireless remote included", "5-year parts warranty", "Standard filtration"]'::jsonb, 18, 5, false, 1),
('p_series', 'P-Series Hyper-Heat', 'better', 'Advanced performance with heating down to -13°F', 1.25, '["Up to 20.5 SEER efficiency", "Hyper-Heating INVERTER®", "Works in extreme cold (-13°F)", "10-year compressor warranty", "Advanced 3D i-see Sensor", "kumo cloud compatible"]'::jsonb, 20.5, 10, true, 2),
('s_series', 'S-Series Premium', 'best', 'Ultimate efficiency and comfort with top-tier features', 1.5, '["Up to 22 SEER efficiency", "Hyper-Heating INVERTER®", "Premium 3D i-see Sensor", "12-year full warranty", "Plasma Quad filtration", "Night setback mode", "kumo cloud included"]'::jsonb, 22, 12, false, 3);

-- =============================================
-- SEED DATA: Add-ons (corrected - 7 columns)
-- =============================================

INSERT INTO public.ductless_addons (name, description, price, price_type, icon_name, is_popular, sort_order) VALUES
('kumo_cloud', 'Control your system from anywhere with the kumo cloud app', 249, 'per_zone', 'Wifi', true, 1),
('line_covers', 'Premium covers to conceal refrigerant lines for a clean look', 199, 'per_zone', 'PaintBucket', false, 2),
('smart_home', 'Connect to Alexa, Google Home, or Apple HomeKit', 149, 'fixed', 'Home', false, 3),
('extended_warranty', 'Comprehensive coverage for complete peace of mind', 499, 'fixed', 'Shield', true, 4),
('surge_protection', 'Protect your investment from electrical surges', 179, 'fixed', 'Zap', false, 5);