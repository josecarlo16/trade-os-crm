
CREATE TABLE public.crm_job_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL UNIQUE REFERENCES public.estimates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  supplier_name text,
  notes text,
  estimate_synced_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_job_lists TO authenticated;
GRANT ALL ON public.crm_job_lists TO service_role;

ALTER TABLE public.crm_job_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage job lists"
  ON public.crm_job_lists FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read job lists"
  ON public.crm_job_lists FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_crm_job_lists_estimate_id ON public.crm_job_lists(estimate_id);

CREATE TRIGGER trg_crm_job_lists_updated_at
  BEFORE UPDATE ON public.crm_job_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.crm_job_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_list_id uuid NOT NULL REFERENCES public.crm_job_lists(id) ON DELETE CASCADE,
  source_line_item_id uuid REFERENCES public.estimate_line_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'each',
  is_manually_edited boolean NOT NULL DEFAULT false,
  manually_added boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_job_list_items TO authenticated;
GRANT ALL ON public.crm_job_list_items TO service_role;

ALTER TABLE public.crm_job_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage job list items"
  ON public.crm_job_list_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read job list items"
  ON public.crm_job_list_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_crm_job_list_items_job_list_id ON public.crm_job_list_items(job_list_id);
CREATE INDEX idx_crm_job_list_items_source_line_item_id ON public.crm_job_list_items(source_line_item_id);

CREATE TRIGGER trg_crm_job_list_items_updated_at
  BEFORE UPDATE ON public.crm_job_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
