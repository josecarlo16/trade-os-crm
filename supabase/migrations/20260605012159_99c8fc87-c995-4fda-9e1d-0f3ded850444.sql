CREATE TABLE public.crm_contract_candidate_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.crm_locations(id) ON DELETE CASCADE,
  dismissed_by UUID REFERENCES auth.users(id),
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

CREATE UNIQUE INDEX crm_contract_candidate_dismissals_unique
  ON public.crm_contract_candidate_dismissals (customer_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contract_candidate_dismissals TO authenticated;
GRANT ALL ON public.crm_contract_candidate_dismissals TO service_role;

ALTER TABLE public.crm_contract_candidate_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dismissals"
  ON public.crm_contract_candidate_dismissals
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'manager')
  );