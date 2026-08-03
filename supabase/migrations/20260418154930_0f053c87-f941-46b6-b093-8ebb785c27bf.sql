
-- Site-wide daily metrics
CREATE TABLE public.gsc_site_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4) NOT NULL DEFAULT 0,
  position NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gsc_site_metrics_date ON public.gsc_site_metrics(date DESC);

-- Per-page rolling 28-day metrics
CREATE TABLE public.gsc_page_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  date_range TEXT NOT NULL DEFAULT '28d',
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4) NOT NULL DEFAULT 0,
  position NUMERIC(6,2) NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_path, date_range)
);

CREATE INDEX idx_gsc_page_metrics_path ON public.gsc_page_metrics(page_path);
CREATE INDEX idx_gsc_page_metrics_clicks ON public.gsc_page_metrics(clicks DESC);

-- Top queries rolling 28-day
CREATE TABLE public.gsc_query_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  date_range TEXT NOT NULL DEFAULT '28d',
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4) NOT NULL DEFAULT 0,
  position NUMERIC(6,2) NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (query, date_range)
);

CREATE INDEX idx_gsc_query_metrics_clicks ON public.gsc_query_metrics(clicks DESC);

-- RLS
ALTER TABLE public.gsc_site_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_page_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_query_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view site metrics" ON public.gsc_site_metrics
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view page metrics" ON public.gsc_page_metrics
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view query metrics" ON public.gsc_query_metrics
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Updated-at triggers
CREATE TRIGGER update_gsc_site_metrics_updated_at BEFORE UPDATE ON public.gsc_site_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gsc_page_metrics_updated_at BEFORE UPDATE ON public.gsc_page_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gsc_query_metrics_updated_at BEFORE UPDATE ON public.gsc_query_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
