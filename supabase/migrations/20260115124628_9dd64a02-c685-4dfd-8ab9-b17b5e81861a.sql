-- Create equipment_systems table for HVAC system configurations and pricing
CREATE TABLE public.equipment_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_name TEXT NOT NULL,
  system_type TEXT NOT NULL CHECK (system_type IN ('mini_split', 'ducted')),
  tonnage DECIMAL(4,2),
  ahri_number TEXT,
  condenser_heat_pump_model TEXT,
  furnace_air_handler_model TEXT,
  evap_coil_model TEXT,
  heat_kit TEXT,
  condenser_price DECIMAL(10,2),
  furnace_air_handler_price DECIMAL(10,2),
  evap_coil_price DECIMAL(10,2),
  heat_kit_price DECIMAL(10,2),
  system_price DECIMAL(10,2),
  seer2 DECIMAL(4,2),
  eer2 DECIMAL(4,2),
  hspf2 DECIMAL(4,2),
  capacity_btuh INTEGER,
  furnace_air_handler_size TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster searching
CREATE INDEX idx_equipment_systems_system_name ON public.equipment_systems(system_name);
CREATE INDEX idx_equipment_systems_system_type ON public.equipment_systems(system_type);
CREATE INDEX idx_equipment_systems_tonnage ON public.equipment_systems(tonnage);

-- Enable RLS
ALTER TABLE public.equipment_systems ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment_systems (admin only)
CREATE POLICY "Admins can view equipment systems"
  ON public.equipment_systems
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert equipment systems"
  ON public.equipment_systems
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update equipment systems"
  ON public.equipment_systems
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete equipment systems"
  ON public.equipment_systems
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create price_books table for PDF uploads
CREATE TABLE public.price_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  category TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.price_books ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_books (admin only)
CREATE POLICY "Admins can view price books"
  ON public.price_books
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert price books"
  ON public.price_books
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete price books"
  ON public.price_books
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on equipment_systems
CREATE TRIGGER update_equipment_systems_updated_at
  BEFORE UPDATE ON public.equipment_systems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for price books
INSERT INTO storage.buckets (id, name, public) VALUES ('price-books', 'price-books', false);

-- Storage policies for price-books bucket
CREATE POLICY "Admins can view price book files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'price-books' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload price book files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'price-books' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete price book files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'price-books' AND public.has_role(auth.uid(), 'admin'));