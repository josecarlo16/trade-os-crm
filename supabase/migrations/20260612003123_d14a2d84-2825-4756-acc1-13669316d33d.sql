
CREATE TABLE IF NOT EXISTS public.crm_social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL UNIQUE,
  display_name text,
  account_id text,
  is_connected boolean NOT NULL DEFAULT false,
  live_enabled boolean NOT NULL DEFAULT false,
  token_status text NOT NULL DEFAULT 'none',
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at timestamptz,
  last_check_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_social_connections TO authenticated;
GRANT ALL ON public.crm_social_connections TO service_role;

ALTER TABLE public.crm_social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read social connections"
  ON public.crm_social_connections FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage social connections"
  ON public.crm_social_connections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_crm_social_connections_updated_at ON public.crm_social_connections;
CREATE TRIGGER trg_crm_social_connections_updated_at
  BEFORE UPDATE ON public.crm_social_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_social_connections (platform, live_enabled)
VALUES
  ('facebook', true),
  ('instagram', false),
  ('tiktok', false),
  ('google_business', false)
ON CONFLICT (platform) DO NOTHING;

-- Extend crm_social_post_targets with scheduling-aware status values
-- (status is text — no enum constraint to alter). Add helpful indexes.
CREATE INDEX IF NOT EXISTS idx_social_post_targets_status
  ON public.crm_social_post_targets (status);
CREATE INDEX IF NOT EXISTS idx_social_post_targets_post
  ON public.crm_social_post_targets (post_id);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
