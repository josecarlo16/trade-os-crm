CREATE TABLE IF NOT EXISTS public.ga4_traffic_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  date_range text NOT NULL CHECK (date_range IN ('7d','30d','90d')),
  sessions integer NOT NULL DEFAULT 0,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, date_range)
);

ALTER TABLE public.ga4_traffic_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/managers can view ga4_traffic_sources"
  ON public.ga4_traffic_sources FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins/managers can insert ga4_traffic_sources"
  ON public.ga4_traffic_sources FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins/managers can update ga4_traffic_sources"
  ON public.ga4_traffic_sources FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins/managers can delete ga4_traffic_sources"
  ON public.ga4_traffic_sources FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));