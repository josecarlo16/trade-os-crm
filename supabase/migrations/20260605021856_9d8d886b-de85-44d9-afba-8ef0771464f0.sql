
-- Create contract tiers table
CREATE TABLE public.crm_contract_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('residential','commercial','both')),
  base_price NUMERIC(10,2),
  additional_unit_price NUMERIC(10,2) DEFAULT 0,
  per_visit_price NUMERIC(10,2),
  visits_per_year INT DEFAULT 2,
  filter_interval_days INT DEFAULT 90,
  inclusions_text TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contract_tiers TO authenticated;
GRANT ALL ON public.crm_contract_tiers TO service_role;

ALTER TABLE public.crm_contract_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tiers" ON public.crm_contract_tiers
  FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "Authenticated read tiers" ON public.crm_contract_tiers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_crm_contract_tiers_updated
  BEFORE UPDATE ON public.crm_contract_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.crm_contract_tiers (name, segment, base_price, additional_unit_price, visits_per_year, filter_interval_days, inclusions_text, sort_order)
VALUES
  ('Comfort Club', 'residential', 189, 99, 2, 90, 'Spring + Fall tune-ups, priority scheduling, 15% discount on repairs', 10),
  ('Platinum', 'residential', 349, 179, 2, 90, 'Spring + Fall tune-ups, free filter changes, priority scheduling, no after-hours fees, 20% discount on repairs', 20),
  ('Commercial Standard', 'commercial', 0, 0, 4, 90, 'Quarterly preventive maintenance, priority response, NTE thresholds, full system reports', 30);

-- Extend contracts
ALTER TABLE public.crm_maintenance_contracts
  ADD COLUMN tier_id UUID REFERENCES public.crm_contract_tiers(id) ON DELETE SET NULL,
  ADD COLUMN tier_name_snapshot TEXT,
  ADD COLUMN inclusions_text TEXT,
  ADD COLUMN unit_count INT DEFAULT 1;
