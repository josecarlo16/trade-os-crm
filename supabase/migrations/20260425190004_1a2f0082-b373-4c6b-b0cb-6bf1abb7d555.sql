-- Tracker for Bach AI analyses and the actionable linking opportunities they produce
CREATE TABLE public.seo_bach_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  question TEXT,
  model TEXT NOT NULL,
  answer_markdown TEXT NOT NULL,
  total_analyzed INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.seo_linking_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.seo_bach_analyses(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,            -- page that should add the link (slug, e.g. /residential-hvac-oak-cliff-dallas/)
  target_url TEXT NOT NULL,            -- page being linked to
  anchor_text TEXT,                    -- suggested anchor; if null, derived from target's H1/title
  cluster TEXT,                        -- e.g. "Oak Cliff", "Commercial Services"
  reason TEXT,                         -- short rationale from Bach
  priority TEXT NOT NULL DEFAULT 'medium', -- high | medium | low
  status TEXT NOT NULL DEFAULT 'todo',  -- todo | in_progress | applied | skipped | failed
  apply_method TEXT,                    -- 'db_content_append' | 'manual_static' | null until known
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  apply_error TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_url, target_url)
);

CREATE INDEX idx_seo_linking_opps_status ON public.seo_linking_opportunities(status);
CREATE INDEX idx_seo_linking_opps_cluster ON public.seo_linking_opportunities(cluster);
CREATE INDEX idx_seo_linking_opps_analysis ON public.seo_linking_opportunities(analysis_id);

ALTER TABLE public.seo_bach_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_linking_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/managers can manage Bach analyses"
  ON public.seo_bach_analyses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

CREATE POLICY "Admins/managers can manage linking opportunities"
  ON public.seo_linking_opportunities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

CREATE TRIGGER update_seo_linking_opps_updated_at
  BEFORE UPDATE ON public.seo_linking_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();