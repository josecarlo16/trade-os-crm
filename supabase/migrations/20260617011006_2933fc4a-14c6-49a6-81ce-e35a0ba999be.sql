
CREATE TABLE public.crm_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_suppliers TO authenticated;
GRANT ALL ON public.crm_suppliers TO service_role;
ALTER TABLE public.crm_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin-manage-suppliers" ON public.crm_suppliers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth-read-suppliers" ON public.crm_suppliers FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_crm_suppliers_updated BEFORE UPDATE ON public.crm_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_supplier_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.crm_suppliers(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  title text,
  email text NOT NULL,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_supplier_contacts TO authenticated;
GRANT ALL ON public.crm_supplier_contacts TO service_role;
CREATE INDEX idx_crm_supplier_contacts_supplier ON public.crm_supplier_contacts(supplier_id);
ALTER TABLE public.crm_supplier_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin-manage-supplier-contacts" ON public.crm_supplier_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth-read-supplier-contacts" ON public.crm_supplier_contacts FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_crm_supplier_contacts_updated BEFORE UPDATE ON public.crm_supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
