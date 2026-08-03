
CREATE TABLE public.workedge_daily_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_at TIMESTAMPTZ DEFAULT now(),
  jobs_created INTEGER DEFAULT 0,
  jobs_updated INTEGER DEFAULT 0,
  attachments_synced INTEGER DEFAULT 0,
  errors JSONB,
  duration_ms INTEGER,
  status TEXT DEFAULT 'pending'
);

ALTER TABLE public.workedge_daily_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sync logs"
  ON public.workedge_daily_sync_log
  FOR SELECT
  TO authenticated
  USING (true);
