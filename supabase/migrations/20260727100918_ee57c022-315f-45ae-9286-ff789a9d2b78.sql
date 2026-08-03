CREATE TABLE public.gsc_page_query_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  query text NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  position numeric NOT NULL DEFAULT 0,
  date_range text NOT NULL DEFAULT '28d',
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gsc_page_query_metrics_unique UNIQUE (page, query, date_range)
);

GRANT SELECT ON public.gsc_page_query_metrics TO authenticated;
GRANT ALL ON public.gsc_page_query_metrics TO service_role;

ALTER TABLE public.gsc_page_query_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view page query metrics"
ON public.gsc_page_query_metrics
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE INDEX idx_gsc_page_query_metrics_page ON public.gsc_page_query_metrics (page, clicks DESC);

CREATE TRIGGER update_gsc_page_query_metrics_updated_at
BEFORE UPDATE ON public.gsc_page_query_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();