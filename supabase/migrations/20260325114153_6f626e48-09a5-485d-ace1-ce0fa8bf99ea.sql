
-- Customer-to-customer relationships
CREATE TABLE public.crm_customer_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  related_customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'other',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_relationship CHECK (customer_id <> related_customer_id),
  UNIQUE (customer_id, related_customer_id, relationship_type)
);

-- RLS
ALTER TABLE public.crm_customer_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users with roles can manage customer relationships"
  ON public.crm_customer_relationships
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );
