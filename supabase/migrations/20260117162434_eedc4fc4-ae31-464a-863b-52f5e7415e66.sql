-- HVAC Equipment Scanner Tables

-- Table: equipment_scans - stores all equipment scans
CREATE TABLE public.equipment_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zip_code VARCHAR(10) NOT NULL,
  email VARCHAR(255),
  brand VARCHAR(100),
  model_number VARCHAR(100) NOT NULL,
  serial_number VARCHAR(100),
  manufactured_year INTEGER,
  tonnage VARCHAR(20),
  refrigerant VARCHAR(50),
  breaker_size VARCHAR(20),
  seer_rating DECIMAL(4,1),
  equipment_type VARCHAR(50),
  fan_motor_info TEXT,
  compressor_info TEXT,
  raw_ai_response JSONB,
  is_dfw BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: equipment_documentation - cached documentation from Firecrawl searches
CREATE TABLE public.equipment_documentation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand VARCHAR(100) NOT NULL,
  model_pattern VARCHAR(100) NOT NULL,
  document_type VARCHAR(50) NOT NULL, -- submittal, manual, spec_sheet, wiring_diagram
  document_title VARCHAR(255),
  document_url TEXT NOT NULL,
  source_url TEXT,
  last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand, model_pattern, document_type, document_url)
);

-- Table: equipment_pages - auto-generated equipment library pages for SEO
CREATE TABLE public.equipment_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE, -- e.g., "carrier/24acc636"
  brand VARCHAR(100) NOT NULL,
  model_number VARCHAR(100) NOT NULL,
  model_pattern VARCHAR(100), -- for grouping variants
  specs JSONB NOT NULL, -- all decoded specifications
  times_searched INTEGER DEFAULT 1,
  auto_generated BOOLEAN DEFAULT TRUE,
  published BOOLEAN DEFAULT TRUE,
  seo_title VARCHAR(255),
  seo_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.equipment_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment_scans
-- Public can insert scans (no auth required for the free tool)
CREATE POLICY "Anyone can create equipment scans" 
ON public.equipment_scans 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view all scans
CREATE POLICY "Admins can view all equipment scans" 
ON public.equipment_scans 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for equipment_documentation
-- Public can read cached documentation
CREATE POLICY "Anyone can read equipment documentation" 
ON public.equipment_documentation 
FOR SELECT 
USING (true);

-- Admins can manage documentation
CREATE POLICY "Admins can manage equipment documentation" 
ON public.equipment_documentation 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Public can insert documentation (from edge function)
CREATE POLICY "Anyone can insert equipment documentation" 
ON public.equipment_documentation 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for equipment_pages
-- Public can view published equipment pages
CREATE POLICY "Anyone can view published equipment pages" 
ON public.equipment_pages 
FOR SELECT 
USING (published = true);

-- Admins can view all equipment pages
CREATE POLICY "Admins can view all equipment pages" 
ON public.equipment_pages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can manage equipment pages
CREATE POLICY "Admins can manage equipment pages" 
ON public.equipment_pages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Anyone can insert equipment pages (from edge function for auto-generation)
CREATE POLICY "Anyone can insert equipment pages" 
ON public.equipment_pages 
FOR INSERT 
WITH CHECK (true);

-- Anyone can update times_searched counter
CREATE POLICY "Anyone can update equipment page search count" 
ON public.equipment_pages 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_equipment_scans_zip_code ON public.equipment_scans(zip_code);
CREATE INDEX idx_equipment_scans_brand ON public.equipment_scans(brand);
CREATE INDEX idx_equipment_scans_created_at ON public.equipment_scans(created_at DESC);
CREATE INDEX idx_equipment_scans_is_dfw ON public.equipment_scans(is_dfw);
CREATE INDEX idx_equipment_documentation_brand_model ON public.equipment_documentation(brand, model_pattern);
CREATE INDEX idx_equipment_pages_slug ON public.equipment_pages(slug);
CREATE INDEX idx_equipment_pages_brand ON public.equipment_pages(brand);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_equipment_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_equipment_pages_updated_at
BEFORE UPDATE ON public.equipment_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_equipment_pages_updated_at();