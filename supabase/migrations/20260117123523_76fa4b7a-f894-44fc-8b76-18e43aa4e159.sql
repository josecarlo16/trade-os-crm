-- Create table for unit type system size pricing
CREATE TABLE public.ductless_unit_size_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_type_id uuid NOT NULL REFERENCES public.ductless_unit_types(id) ON DELETE CASCADE,
  size_tons numeric NOT NULL,
  size_btu integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_type_id, size_tons)
);

-- Enable RLS
ALTER TABLE public.ductless_unit_size_pricing ENABLE ROW LEVEL SECURITY;

-- Admin can manage all size pricing
CREATE POLICY "Admins can manage size pricing" ON public.ductless_unit_size_pricing
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Managers can view size pricing
CREATE POLICY "Managers can view size pricing" ON public.ductless_unit_size_pricing
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Public can view available sizes (for the estimator)
CREATE POLICY "Public can view available sizes" ON public.ductless_unit_size_pricing
  FOR SELECT USING (is_available = true);

-- Seed default data for all existing unit types with the 7 system sizes
INSERT INTO public.ductless_unit_size_pricing (unit_type_id, size_tons, size_btu, price, is_available, sort_order)
SELECT 
  ut.id,
  sizes.tons,
  sizes.btu,
  ut.base_price,
  true,
  sizes.sort_order
FROM public.ductless_unit_types ut
CROSS JOIN (VALUES 
  (0.6, 7200, 1),
  (0.9, 10800, 2),
  (1.0, 12000, 3),
  (1.25, 15000, 4),
  (1.5, 18000, 5),
  (2.0, 24000, 6),
  (2.5, 30000, 7)
) AS sizes(tons, btu, sort_order);