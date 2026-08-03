
CREATE TABLE public.individual_equipment_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model_number TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.individual_equipment_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on individual_equipment_pricing"
ON public.individual_equipment_pricing
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager')
  )
);

CREATE TRIGGER update_individual_equipment_pricing_updated_at
  BEFORE UPDATE ON public.individual_equipment_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
