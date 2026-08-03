
-- ============== ENUMS ==============
CREATE TYPE public.maintenance_segment AS ENUM ('residential', 'commercial');
CREATE TYPE public.maintenance_status AS ENUM ('active', 'pending', 'paused', 'expired', 'cancelled');
CREATE TYPE public.maintenance_billing_model AS ENUM ('paid_yearly', 'paid_monthly', 'pay_per_visit');
CREATE TYPE public.maintenance_visit_type AS ENUM ('spring_tune_up', 'fall_tune_up', 'quarterly', 'filter_only', 'other');

-- ============== CONTRACTS TABLE ==============
CREATE TABLE public.crm_maintenance_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.crm_locations(id) ON DELETE SET NULL,
  workedge_property_id text,
  segment public.maintenance_segment NOT NULL DEFAULT 'residential',
  tier text,
  status public.maintenance_status NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  auto_renew boolean NOT NULL DEFAULT true,
  renewal_term_months integer NOT NULL DEFAULT 12,
  billing_model public.maintenance_billing_model NOT NULL DEFAULT 'paid_yearly',
  contract_price numeric(12,2),
  per_visit_price numeric(12,2),
  visits_per_year integer NOT NULL DEFAULT 2,
  last_visit_date date,
  next_visit_due date,
  filter_change_interval_days integer NOT NULL DEFAULT 90,
  last_filter_change date,
  next_filter_due date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_maint_contracts_customer ON public.crm_maintenance_contracts(customer_id);
CREATE INDEX idx_crm_maint_contracts_location ON public.crm_maintenance_contracts(location_id);
CREATE INDEX idx_crm_maint_contracts_status ON public.crm_maintenance_contracts(status);
CREATE INDEX idx_crm_maint_contracts_segment ON public.crm_maintenance_contracts(segment);
CREATE INDEX idx_crm_maint_contracts_next_visit ON public.crm_maintenance_contracts(next_visit_due);
CREATE INDEX idx_crm_maint_contracts_end_date ON public.crm_maintenance_contracts(end_date);

-- ============== FILTERS TABLE ==============
CREATE TABLE public.crm_contract_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.crm_maintenance_contracts(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  merv_rating text,
  interval_days integer NOT NULL DEFAULT 90,
  last_changed date,
  next_due date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_contract_filters_contract ON public.crm_contract_filters(contract_id);

-- ============== VISITS TABLE ==============
CREATE TABLE public.crm_contract_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.crm_maintenance_contracts(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.crm_jobs(id) ON DELETE SET NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  visit_type public.maintenance_visit_type NOT NULL DEFAULT 'other',
  technician_id uuid REFERENCES public.crm_team_members(id) ON DELETE SET NULL,
  filters_changed boolean NOT NULL DEFAULT false,
  workedge_media_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_contract_visits_contract ON public.crm_contract_visits(contract_id);
CREATE INDEX idx_crm_contract_visits_date ON public.crm_contract_visits(visit_date);

-- ============== UPDATED_AT TRIGGERS ==============
CREATE TRIGGER trg_crm_maint_contracts_updated_at
  BEFORE UPDATE ON public.crm_maintenance_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_crm_contract_filters_updated_at
  BEFORE UPDATE ON public.crm_contract_filters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_crm_contract_visits_updated_at
  BEFORE UPDATE ON public.crm_contract_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== CONTRACT NUMBER GENERATOR ==============
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_number TEXT;
BEGIN
  current_year := to_char(now() AT TIME ZONE 'America/Chicago', 'YYYY');
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(contract_number, '^MNT-' || current_year || '-', ''), contract_number)::INTEGER
  ), 0) + 1
  INTO next_number
  FROM public.crm_maintenance_contracts
  WHERE contract_number LIKE 'MNT-' || current_year || '-%';
  new_number := 'MNT-' || current_year || '-' || lpad(next_number::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_contract_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := public.generate_contract_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_contract_number
  BEFORE INSERT ON public.crm_maintenance_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_contract_number();

-- ============== FILTER ROLLUP ==============
CREATE OR REPLACE FUNCTION public.recalc_contract_filter_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contract_id uuid;
  v_min_next date;
  v_max_last date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_contract_id := OLD.contract_id;
  ELSE
    v_contract_id := NEW.contract_id;
  END IF;

  SELECT MIN(next_due), MAX(last_changed)
    INTO v_min_next, v_max_last
  FROM public.crm_contract_filters
  WHERE contract_id = v_contract_id;

  UPDATE public.crm_maintenance_contracts
     SET next_filter_due = v_min_next,
         last_filter_change = v_max_last,
         updated_at = now()
   WHERE id = v_contract_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_contract_filter_rollup
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_contract_filters
  FOR EACH ROW EXECUTE FUNCTION public.recalc_contract_filter_rollup();

-- ============== VISIT ROLLUP ==============
CREATE OR REPLACE FUNCTION public.recalc_contract_next_visit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_visits_per_year integer;
  v_interval integer;
BEGIN
  SELECT visits_per_year INTO v_visits_per_year
  FROM public.crm_maintenance_contracts
  WHERE id = NEW.contract_id;

  IF v_visits_per_year IS NULL OR v_visits_per_year = 0 THEN
    v_visits_per_year := 2;
  END IF;
  v_interval := GREATEST(1, ROUND(365.0 / v_visits_per_year)::int);

  UPDATE public.crm_maintenance_contracts
     SET last_visit_date = NEW.visit_date,
         next_visit_due = NEW.visit_date + v_interval,
         updated_at = now()
   WHERE id = NEW.contract_id
     AND (last_visit_date IS NULL OR NEW.visit_date >= last_visit_date);

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_contract_next_visit
  AFTER INSERT ON public.crm_contract_visits
  FOR EACH ROW EXECUTE FUNCTION public.recalc_contract_next_visit();

-- ============== NOTIFICATIONS ==============
CREATE OR REPLACE FUNCTION public.notify_new_maintenance_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cust_name text;
BEGIN
  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    INTO cust_name
  FROM public.crm_customers WHERE id = NEW.customer_id;

  INSERT INTO public.admin_notifications (user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
  VALUES (NULL, 'maintenance', 'New Maintenance Contract',
          NEW.contract_number || ' created for ' || COALESCE(NULLIF(cust_name, ''), 'customer'),
          'Wrench', 'amber', '/admin/contracts/' || NEW.id, NEW.id, 'crm_maintenance_contracts');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_maintenance_contract
  AFTER INSERT ON public.crm_maintenance_contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_maintenance_contract();

CREATE OR REPLACE FUNCTION public.notify_maintenance_visit_logged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cust_name text;
  c_number text;
  cust_id uuid;
BEGIN
  SELECT mc.customer_id, mc.contract_number INTO cust_id, c_number
  FROM public.crm_maintenance_contracts mc WHERE mc.id = NEW.contract_id;

  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    INTO cust_name
  FROM public.crm_customers WHERE id = cust_id;

  INSERT INTO public.admin_notifications (user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
  VALUES (NULL, 'maintenance', 'Maintenance Visit Logged',
          'Visit on ' || to_char(NEW.visit_date, 'Mon DD') || ' for ' || COALESCE(NULLIF(cust_name, ''), 'customer') || ' (' || COALESCE(c_number, '') || ')',
          'Wrench', 'green', '/admin/contracts/' || NEW.contract_id, NEW.contract_id, 'crm_maintenance_contracts');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_maintenance_visit
  AFTER INSERT ON public.crm_contract_visits
  FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_visit_logged();

-- ============== RLS ==============
ALTER TABLE public.crm_maintenance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contract_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contract_visits ENABLE ROW LEVEL SECURITY;

-- Contracts
CREATE POLICY "Staff can view contracts" ON public.crm_maintenance_contracts
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'technician'::app_role)
    OR public.has_role(auth.uid(), 'lead_tech'::app_role)
    OR public.has_role(auth.uid(), 'installer'::app_role)
    OR public.has_role(auth.uid(), 'helper'::app_role)
  );
CREATE POLICY "Managers can insert contracts" ON public.crm_maintenance_contracts
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );
CREATE POLICY "Managers can update contracts" ON public.crm_maintenance_contracts
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );
CREATE POLICY "Managers can delete contracts" ON public.crm_maintenance_contracts
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

-- Filters
CREATE POLICY "Staff can view contract filters" ON public.crm_contract_filters
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'technician'::app_role)
    OR public.has_role(auth.uid(), 'lead_tech'::app_role)
    OR public.has_role(auth.uid(), 'installer'::app_role)
    OR public.has_role(auth.uid(), 'helper'::app_role)
  );
CREATE POLICY "Managers can write contract filters" ON public.crm_contract_filters
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

-- Visits
CREATE POLICY "Staff can view contract visits" ON public.crm_contract_visits
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'technician'::app_role)
    OR public.has_role(auth.uid(), 'lead_tech'::app_role)
    OR public.has_role(auth.uid(), 'installer'::app_role)
    OR public.has_role(auth.uid(), 'helper'::app_role)
  );
CREATE POLICY "Staff can insert contract visits" ON public.crm_contract_visits
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'technician'::app_role)
    OR public.has_role(auth.uid(), 'lead_tech'::app_role)
    OR public.has_role(auth.uid(), 'installer'::app_role)
  );
CREATE POLICY "Managers can update contract visits" ON public.crm_contract_visits
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );
CREATE POLICY "Managers can delete contract visits" ON public.crm_contract_visits
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );
