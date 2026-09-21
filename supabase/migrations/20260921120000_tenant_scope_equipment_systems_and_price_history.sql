-- Per-tenant equipment pricing + price history
-- equipment_systems was left global (no tenant_id) when multi-tenancy was
-- introduced, same class of gap as admin_costs/ductless pricing before it.
-- individual_equipment_pricing already has tenant_id but no DEFAULT, so it
-- silently only "works" today because there's a single tenant in production.
-- This migration scopes equipment_systems per-tenant, adds a safe DEFAULT to
-- individual_equipment_pricing, and introduces price history tables so price
-- changes (manual or via the price-sheet importer) are tracked over time.

-- 1. Scope equipment_systems to a tenant -----------------------------------
ALTER TABLE public.equipment_systems ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.equipment_systems SET tenant_id = 'cb75a3f3-f310-4587-a4cc-098f50aef59c' WHERE tenant_id IS NULL;
ALTER TABLE public.equipment_systems
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.get_current_tenant_id();

DROP POLICY IF EXISTS "Admins can view equipment systems" ON public.equipment_systems;
DROP POLICY IF EXISTS "Admins can insert equipment systems" ON public.equipment_systems;
DROP POLICY IF EXISTS "Admins can update equipment systems" ON public.equipment_systems;
DROP POLICY IF EXISTS "Admins can delete equipment systems" ON public.equipment_systems;

CREATE POLICY "Admins can manage their tenant's equipment systems"
  ON public.equipment_systems FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(), 'admin'));

-- 2. Close the individual_equipment_pricing tenant_id gap -------------------
ALTER TABLE public.individual_equipment_pricing
  ALTER COLUMN tenant_id SET DEFAULT public.get_current_tenant_id();

-- 3. Price history for equipment_systems ------------------------------------
CREATE TABLE public.equipment_system_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment_systems(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  price NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import')),
  notes TEXT,
  created_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_system_price_history_equipment
  ON public.equipment_system_price_history (equipment_id, changed_at DESC);

ALTER TABLE public.equipment_system_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their tenant's equipment price history"
  ON public.equipment_system_price_history FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_equipment_system_price_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.system_price IS DISTINCT FROM OLD.system_price THEN
    INSERT INTO public.equipment_system_price_history (equipment_id, tenant_id, price, source, created_by)
    VALUES (NEW.id, NEW.tenant_id, COALESCE(NEW.system_price, 0), COALESCE(current_setting('app.price_change_source', true), 'manual'), auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_equipment_system_price_change
  AFTER INSERT OR UPDATE ON public.equipment_systems
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_system_price_change();

-- Backfill: seed one history entry per existing system from its current price
INSERT INTO public.equipment_system_price_history (equipment_id, tenant_id, price, source, notes)
SELECT id, tenant_id, COALESCE(system_price, 0), 'manual', 'Backfill from existing price'
FROM public.equipment_systems;

-- 4. Price history for individual_equipment_pricing --------------------------
CREATE TABLE public.individual_equipment_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.individual_equipment_pricing(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  price NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import')),
  notes TEXT,
  created_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_individual_equipment_price_history_equipment
  ON public.individual_equipment_price_history (equipment_id, changed_at DESC);

ALTER TABLE public.individual_equipment_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their tenant's individual equipment price history"
  ON public.individual_equipment_price_history FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_individual_equipment_price_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.individual_equipment_price_history (equipment_id, tenant_id, price, source, created_by)
    VALUES (NEW.id, NEW.tenant_id, NEW.price, COALESCE(current_setting('app.price_change_source', true), 'manual'), auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_individual_equipment_price_change
  AFTER INSERT OR UPDATE ON public.individual_equipment_pricing
  FOR EACH ROW EXECUTE FUNCTION public.log_individual_equipment_price_change();

-- Backfill: seed one history entry per existing row from its current price
INSERT INTO public.individual_equipment_price_history (equipment_id, tenant_id, price, source, notes)
SELECT id, tenant_id, price, 'manual', 'Backfill from existing price'
FROM public.individual_equipment_pricing;
