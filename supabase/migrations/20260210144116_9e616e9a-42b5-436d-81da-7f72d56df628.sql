
-- Create crm_companies table
CREATE TABLE public.crm_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  notes TEXT,
  tags TEXT[],
  lead_source TEXT,
  workedge_customer_id TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can view companies"
  ON public.crm_companies FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create companies"
  ON public.crm_companies FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies"
  ON public.crm_companies FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete companies"
  ON public.crm_companies FOR DELETE
  TO authenticated USING (true);

-- Timestamp trigger
CREATE TRIGGER update_crm_companies_updated_at
  BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add company_id to crm_customers
ALTER TABLE public.crm_customers
  ADD COLUMN company_id UUID REFERENCES public.crm_companies(id);
