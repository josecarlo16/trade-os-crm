
-- Junction table for linking locations to multiple customers
CREATE TABLE public.crm_location_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.crm_locations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'owner',
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(location_id, customer_id)
);

-- Enable RLS
ALTER TABLE public.crm_location_customers ENABLE ROW LEVEL SECURITY;

-- RLS policies using existing has_role function
CREATE POLICY "Admins can manage location customers"
  ON public.crm_location_customers
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Backfill existing customer_id relationships as 'owner'
INSERT INTO public.crm_location_customers (location_id, customer_id, relationship_type, is_primary_contact)
SELECT id, customer_id, 'owner', true
FROM public.crm_locations
WHERE deleted_at IS NULL
ON CONFLICT (location_id, customer_id) DO NOTHING;
