
CREATE TABLE public.equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('individual_equipment', 'equipment_system')),
  owner_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'submittal', 'spec_sheet', 'install_manual', 'owner_manual',
    'warranty', 'wiring_diagram', 'cut_sheet', 'energy_guide', 'other'
  )),
  file_name TEXT NOT NULL,
  display_name TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_documents_owner ON public.equipment_documents(owner_type, owner_id);
CREATE INDEX idx_equipment_documents_type ON public.equipment_documents(document_type);

ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage equipment documents"
ON public.equipment_documents FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE TRIGGER update_equipment_documents_updated_at
  BEFORE UPDATE ON public.equipment_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-documents', 'equipment-documents', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Admins read equipment docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'equipment-documents'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

CREATE POLICY "Admins upload equipment docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'equipment-documents'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

CREATE POLICY "Admins update equipment docs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'equipment-documents'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

CREATE POLICY "Admins delete equipment docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'equipment-documents'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);
