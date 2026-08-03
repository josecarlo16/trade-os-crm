
-- =========================================================
-- STEP 1: Extend materials_catalog
-- =========================================================
ALTER TABLE public.materials_catalog
  ADD COLUMN image_url TEXT,
  ADD COLUMN name_es TEXT,
  ADD COLUMN request_category TEXT,
  ADD COLUMN show_in_estimates BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN show_in_takeoff BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.materials_catalog.request_category IS
  'Field-facing grouping (Tools, Electrical, Refrigerant, Install Materials). Separate from the cost-accounting category enum.';
COMMENT ON COLUMN public.materials_catalog.show_in_estimates IS
  'If true, item appears in the estimate builder material picker (with cost).';
COMMENT ON COLUMN public.materials_catalog.show_in_takeoff IS
  'If true, item appears in the field takeoff catalog (NO cost shown to field roles).';

UPDATE public.materials_catalog SET show_in_estimates = true;

CREATE INDEX idx_materials_show_in_takeoff
  ON public.materials_catalog(show_in_takeoff) WHERE show_in_takeoff = true;
CREATE INDEX idx_materials_show_in_estimates
  ON public.materials_catalog(show_in_estimates) WHERE show_in_estimates = true;
CREATE INDEX idx_materials_request_category
  ON public.materials_catalog(request_category);

-- =========================================================
-- STEP 2: Extend existing crm_suppliers table
-- (Table already exists with name, notes, is_active.
--  Empty today, so adding NOT NULL columns is safe.)
-- =========================================================
ALTER TABLE public.crm_suppliers
  ADD COLUMN company_id UUID NOT NULL,
  ADD COLUMN address TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN account_number TEXT,
  ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Replace existing admin-only policies with admin OR manager,
-- matching the has_role pattern.
DROP POLICY IF EXISTS "admin-manage-suppliers" ON public.crm_suppliers;
DROP POLICY IF EXISTS "auth-read-suppliers" ON public.crm_suppliers;

CREATE POLICY "Authenticated users can view suppliers"
  ON public.crm_suppliers FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

CREATE POLICY "Admins and managers manage suppliers"
  ON public.crm_suppliers FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

CREATE INDEX idx_suppliers_active ON public.crm_suppliers(is_active);

-- =========================================================
-- STEP 3: material_suppliers link table
-- =========================================================
CREATE TABLE public.material_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials_catalog(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.crm_suppliers(id) ON DELETE CASCADE,
  preference_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(material_id, supplier_id)
);

COMMENT ON COLUMN public.material_suppliers.preference_rank IS
  'NULL = any of the tagged suppliers is fine. 1/2/3 = ranked preference order. If a material has no rows here, fall back to crm_suppliers.is_default.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_suppliers TO authenticated;
GRANT ALL ON public.material_suppliers TO service_role;

ALTER TABLE public.material_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view material suppliers"
  ON public.material_suppliers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers manage material suppliers"
  ON public.material_suppliers FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

CREATE INDEX idx_material_suppliers_material ON public.material_suppliers(material_id);
CREATE INDEX idx_material_suppliers_supplier ON public.material_suppliers(supplier_id);

-- =========================================================
-- STEP 4: material_requests
-- =========================================================
CREATE TYPE public.material_request_status AS ENUM (
  'draft', 'submitted', 'reviewed', 'fulfilled', 'cancelled'
);

CREATE TABLE public.material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  job_id UUID REFERENCES public.crm_jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  source_estimate_id UUID,
  list_name TEXT,
  requested_by UUID NOT NULL,
  reviewed_by UUID,
  status public.material_request_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_requests TO authenticated;
GRANT ALL ON public.material_requests TO service_role;

ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all requests"
  ON public.material_requests FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users create own requests"
  ON public.material_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Users edit own requests until reviewed"
  ON public.material_requests FOR UPDATE TO authenticated
  USING (
    (requested_by = auth.uid() AND status IN ('draft','submitted'))
    OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
  );

CREATE POLICY "Admins and managers delete requests"
  ON public.material_requests FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

CREATE INDEX idx_material_requests_job ON public.material_requests(job_id);
CREATE INDEX idx_material_requests_status ON public.material_requests(status);
CREATE INDEX idx_material_requests_requested_by ON public.material_requests(requested_by);

-- =========================================================
-- STEP 5: material_request_items
-- =========================================================
CREATE TABLE public.material_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.material_requests(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials_catalog(id),
  custom_item TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT,
  from_takeoff BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT item_has_material_or_custom
    CHECK (material_id IS NOT NULL OR custom_item IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_request_items TO authenticated;
GRANT ALL ON public.material_request_items TO service_role;

ALTER TABLE public.material_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View request items"
  ON public.material_request_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Manage request items follows parent"
  ON public.material_request_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.material_requests r
    WHERE r.id = request_id AND (
      (r.requested_by = auth.uid() AND r.status IN ('draft','submitted'))
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.material_requests r
    WHERE r.id = request_id AND (
      (r.requested_by = auth.uid() AND r.status IN ('draft','submitted'))
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
    )
  ));

CREATE INDEX idx_request_items_request ON public.material_request_items(request_id);

-- =========================================================
-- STEP 7: Status-change logging to crm_interactions
-- (Project has no crm_events / log_event() — crm_interactions is
--  the existing system-event log, used via logSystemInteraction.)
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_material_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  evt_type TEXT;
  ts TIMESTAMPTZ := now();
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  evt_type := 'material_request.' || NEW.status::text;

  -- Stamp the matching status timestamp.
  IF NEW.status = 'submitted' AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at := ts;
  ELSIF NEW.status = 'reviewed' AND NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at := ts;
  ELSIF NEW.status = 'fulfilled' AND NEW.fulfilled_at IS NULL THEN
    NEW.fulfilled_at := ts;
  END IF;

  -- Only log to interactions if we have a customer (table requires it).
  IF NEW.customer_id IS NOT NULL
     AND NEW.status IN ('submitted','reviewed','fulfilled','cancelled') THEN
    INSERT INTO public.crm_interactions (
      customer_id, interaction_type, subject, content, logged_by
    ) VALUES (
      NEW.customer_id,
      'system',
      evt_type,
      jsonb_build_object(
        'request_id', NEW.id,
        'job_id', NEW.job_id,
        'requested_by', NEW.requested_by,
        'reviewed_by', NEW.reviewed_by,
        'list_name', NEW.list_name
      )::text,
      COALESCE(NEW.reviewed_by, NEW.requested_by)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_material_request_status_change
  BEFORE INSERT OR UPDATE OF status ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_material_request_status_change();

-- =========================================================
-- STEP 8: updated_at triggers
-- (crm_suppliers already has one; only material_requests is new.)
-- =========================================================
CREATE TRIGGER update_material_requests_updated_at
  BEFORE UPDATE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
