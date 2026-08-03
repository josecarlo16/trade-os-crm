
-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create sitemap snapshots table
CREATE TABLE public.sitemap_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xml_content text NOT NULL,
  url_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sitemap_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can read snapshots
CREATE POLICY "Admins can view sitemap snapshots"
ON public.sitemap_snapshots
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- Allow service role full access (for edge function inserts)
-- Service role bypasses RLS by default, so no policy needed for inserts
