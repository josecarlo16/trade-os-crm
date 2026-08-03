-- SEO Intelligence Hub tables

CREATE TABLE public.seo_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  original_prompt text NOT NULL,
  summary text NOT NULL,
  full_response text NOT NULL,
  report_type text CHECK (report_type IN ('site_audit','keyword_gap','indexing','performance','cluster','general')),
  pages_analyzed int,
  pages_flagged int,
  model_used text,
  tags text[] NOT NULL DEFAULT '{}',
  related_page_paths text[] NOT NULL DEFAULT '{}',
  related_clusters text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.seo_report_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.seo_reports(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.seo_report_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.seo_reports(id) ON DELETE CASCADE,
  action_text text NOT NULL,
  page_path text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','skipped')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.page_seo_gsc_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.page_seo(id) ON DELETE CASCADE,
  week_starting date NOT NULL,
  clicks int NOT NULL DEFAULT 0,
  impressions int NOT NULL DEFAULT 0,
  avg_position numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, week_starting)
);

CREATE TABLE public.ga4_page_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  date_range text NOT NULL CHECK (date_range IN ('7d','30d','90d')),
  sessions int NOT NULL DEFAULT 0,
  users int NOT NULL DEFAULT 0,
  avg_engagement_seconds numeric,
  conversions int NOT NULL DEFAULT 0,
  bounce_rate numeric,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_path, date_range)
);

-- Indexes
CREATE INDEX seo_reports_tags_gin ON public.seo_reports USING GIN (tags);
CREATE INDEX seo_reports_related_paths_gin ON public.seo_reports USING GIN (related_page_paths);
CREATE INDEX seo_reports_fts_gin ON public.seo_reports USING GIN (to_tsvector('english', title || ' ' || summary || ' ' || full_response));
CREATE INDEX seo_report_messages_report_created_idx ON public.seo_report_messages (report_id, created_at);
CREATE INDEX seo_report_actions_report_status_idx ON public.seo_report_actions (report_id, status);

-- updated_at trigger for seo_reports
CREATE TRIGGER update_seo_reports_updated_at
  BEFORE UPDATE ON public.seo_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.seo_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_report_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_report_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_seo_gsc_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga4_page_metrics ENABLE ROW LEVEL SECURITY;

-- Helper expression: admin or manager
-- Policies: admins and managers can do everything

-- seo_reports
CREATE POLICY "Admins/managers can view seo_reports" ON public.seo_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can insert seo_reports" ON public.seo_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can update seo_reports" ON public.seo_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can delete seo_reports" ON public.seo_reports
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));

-- seo_report_messages
CREATE POLICY "Admins/managers can view seo_report_messages" ON public.seo_report_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can insert seo_report_messages" ON public.seo_report_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can update seo_report_messages" ON public.seo_report_messages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can delete seo_report_messages" ON public.seo_report_messages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));

-- seo_report_actions
CREATE POLICY "Admins/managers can view seo_report_actions" ON public.seo_report_actions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can insert seo_report_actions" ON public.seo_report_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can update seo_report_actions" ON public.seo_report_actions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can delete seo_report_actions" ON public.seo_report_actions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));

-- page_seo_gsc_snapshots
CREATE POLICY "Admins/managers can view page_seo_gsc_snapshots" ON public.page_seo_gsc_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can insert page_seo_gsc_snapshots" ON public.page_seo_gsc_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can update page_seo_gsc_snapshots" ON public.page_seo_gsc_snapshots
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can delete page_seo_gsc_snapshots" ON public.page_seo_gsc_snapshots
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));

-- ga4_page_metrics
CREATE POLICY "Admins/managers can view ga4_page_metrics" ON public.ga4_page_metrics
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can insert ga4_page_metrics" ON public.ga4_page_metrics
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can update ga4_page_metrics" ON public.ga4_page_metrics
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins/managers can delete ga4_page_metrics" ON public.ga4_page_metrics
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'));