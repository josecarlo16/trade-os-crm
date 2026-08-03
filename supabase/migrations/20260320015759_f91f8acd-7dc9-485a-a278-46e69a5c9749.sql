
-- Create CRM location equipment table
CREATE TABLE public.crm_location_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.crm_locations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.crm_customers(id) ON DELETE CASCADE NOT NULL,
  
  equipment_type TEXT NOT NULL DEFAULT 'hvac',
  brand TEXT,
  model_number TEXT,
  serial_number TEXT,
  
  tonnage NUMERIC(4,1),
  seer_rating NUMERIC(4,1),
  hspf_rating NUMERIC(4,1),
  btu_capacity INTEGER,
  refrigerant_type TEXT,
  
  install_date DATE,
  manufacture_date DATE,
  estimated_age INTEGER,
  condition_rating INTEGER,
  
  last_service_date DATE,
  next_service_due DATE,
  warranty_expiration DATE,
  
  location_description TEXT,
  zone_served TEXT,
  notes TEXT,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  replacement_recommended BOOLEAN NOT NULL DEFAULT false,
  replacement_priority TEXT,
  replacement_notes TEXT,
  
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER set_crm_location_equipment_updated_at
  BEFORE UPDATE ON public.crm_location_equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.crm_location_equipment ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin/manager/super_admin
CREATE POLICY "Admins can view all equipment"
  ON public.crm_location_equipment FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins can insert equipment"
  ON public.crm_location_equipment FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins can update equipment"
  ON public.crm_location_equipment FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins can delete equipment"
  ON public.crm_location_equipment FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'super_admin')
  );
