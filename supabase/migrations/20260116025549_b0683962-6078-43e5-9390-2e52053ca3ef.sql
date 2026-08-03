-- =====================================================
-- Phase 2: Estimates Core Structure
-- Estimates and Estimate Line Items
-- =====================================================

-- Create estimate status enum
CREATE TYPE public.estimate_status AS ENUM (
  'draft',
  'sent',
  'accepted',
  'declined',
  'expired'
);

-- Create job type enum
CREATE TYPE public.job_type AS ENUM (
  'residential_new',
  'residential_replacement',
  'commercial_new',
  'commercial_replacement',
  'maintenance',
  'repair'
);

-- Create heating type enum  
CREATE TYPE public.heating_type AS ENUM (
  'gas',
  'electric',
  'heat_pump',
  'dual_fuel'
);

-- Create line item type enum
CREATE TYPE public.line_item_type AS ENUM (
  'equipment',
  'material',
  'labor',
  'admin_cost',
  'custom'
);

-- =====================================================
-- ESTIMATES TABLE
-- =====================================================
CREATE TABLE public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_number TEXT UNIQUE NOT NULL,
  
  -- Customer Information
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  
  -- Job Details
  job_type job_type NOT NULL DEFAULT 'residential_replacement',
  heating_type heating_type NOT NULL DEFAULT 'gas',
  job_notes TEXT,
  
  -- Status
  status estimate_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  
  -- Pricing
  profit_margin NUMERIC(4,2) NOT NULL DEFAULT 1.60,
  subtotal_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0825,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only write, authenticated read
CREATE POLICY "Admins can manage estimates"
  ON public.estimates
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view estimates"
  ON public.estimates
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_estimates_status ON public.estimates(status);
CREATE INDEX idx_estimates_customer_name ON public.estimates(customer_name);
CREATE INDEX idx_estimates_created_at ON public.estimates(created_at DESC);

-- =====================================================
-- ESTIMATE LINE ITEMS TABLE
-- =====================================================
CREATE TABLE public.estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  
  -- Item Details
  item_type line_item_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Source References (optional)
  material_id UUID REFERENCES public.materials_catalog(id) ON DELETE SET NULL,
  labor_rate_id UUID REFERENCES public.labor_rates(id) ON DELETE SET NULL,
  admin_cost_id UUID REFERENCES public.admin_costs(id) ON DELETE SET NULL,
  equipment_system_id UUID REFERENCES public.equipment_systems(id) ON DELETE SET NULL,
  
  -- Quantity & Pricing
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Sorting
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage estimate line items"
  ON public.estimate_line_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view estimate line items"
  ON public.estimate_line_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_estimate_line_items_estimate_id ON public.estimate_line_items(estimate_id);
CREATE INDEX idx_estimate_line_items_item_type ON public.estimate_line_items(item_type);

-- =====================================================
-- ESTIMATE NUMBER GENERATOR FUNCTION
-- Format: TRU-YYYY-NNNN (e.g., TRU-2026-0001)
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_estimate_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_estimate_number TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');
  
  -- Get the next number for this year
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(estimate_number, '^TRU-' || current_year || '-', ''), estimate_number)::INTEGER
  ), 0) + 1
  INTO next_number
  FROM public.estimates
  WHERE estimate_number LIKE 'TRU-' || current_year || '-%';
  
  new_estimate_number := 'TRU-' || current_year || '-' || lpad(next_number::TEXT, 4, '0');
  
  RETURN new_estimate_number;
END;
$$;

-- =====================================================
-- AUTO-SET ESTIMATE NUMBER ON INSERT
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_estimate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estimate_number IS NULL OR NEW.estimate_number = '' THEN
    NEW.estimate_number := public.generate_estimate_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_estimate_number
  BEFORE INSERT ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_estimate_number();

-- =====================================================
-- CALCULATE LINE ITEM TOTAL
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_line_item_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.line_total := NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_line_item_total
  BEFORE INSERT OR UPDATE ON public.estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_line_item_total();

-- =====================================================
-- RECALCULATE ESTIMATE TOTALS
-- =====================================================
CREATE OR REPLACE FUNCTION public.recalculate_estimate_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estimate_id UUID;
  v_subtotal_cost NUMERIC(12,2);
  v_profit_margin NUMERIC(4,2);
  v_tax_rate NUMERIC(5,4);
  v_subtotal_charge NUMERIC(12,2);
  v_tax_amount NUMERIC(12,2);
  v_grand_total NUMERIC(12,2);
BEGIN
  -- Determine which estimate to update
  IF TG_OP = 'DELETE' THEN
    v_estimate_id := OLD.estimate_id;
  ELSE
    v_estimate_id := NEW.estimate_id;
  END IF;
  
  -- Calculate subtotal cost from line items
  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal_cost
  FROM public.estimate_line_items
  WHERE estimate_id = v_estimate_id;
  
  -- Get estimate pricing settings
  SELECT profit_margin, tax_rate
  INTO v_profit_margin, v_tax_rate
  FROM public.estimates
  WHERE id = v_estimate_id;
  
  -- Calculate charge and tax
  v_subtotal_charge := v_subtotal_cost * v_profit_margin;
  v_tax_amount := v_subtotal_charge * v_tax_rate;
  v_grand_total := v_subtotal_charge + v_tax_amount;
  
  -- Update estimate totals
  UPDATE public.estimates
  SET 
    subtotal_cost = v_subtotal_cost,
    subtotal_charge = v_subtotal_charge,
    tax_amount = v_tax_amount,
    grand_total = v_grand_total,
    updated_at = now()
  WHERE id = v_estimate_id;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_recalculate_estimate_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_estimate_totals();

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimate_line_items_updated_at
  BEFORE UPDATE ON public.estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();