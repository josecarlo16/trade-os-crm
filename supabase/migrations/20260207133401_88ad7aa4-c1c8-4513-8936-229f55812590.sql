-- Phase 4: WorkEdge Integration Database Schema

-- Integration configs table for API settings
CREATE TABLE IF NOT EXISTS public.integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WorkEdge sync log for tracking all sync operations
CREATE TABLE IF NOT EXISTS public.workedge_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'project', 'equipment', 'media')),
  local_id UUID NOT NULL,
  workedge_id TEXT,
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('push', 'pull')),
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'success', 'failed')),
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WorkEdge project media cache (photos, videos, notes from field)
CREATE TABLE IF NOT EXISTS public.workedge_project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.crm_jobs(id) ON DELETE CASCADE,
  workedge_project_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'voice_note', 'note', 'document')),
  media_url TEXT,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  transcription TEXT,
  captured_by TEXT,
  captured_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add WorkEdge fields to crm_jobs
ALTER TABLE public.crm_jobs
ADD COLUMN IF NOT EXISTS workedge_project_id TEXT,
ADD COLUMN IF NOT EXISTS workedge_last_sync TIMESTAMPTZ;

-- Add WorkEdge fields to crm_customers
ALTER TABLE public.crm_customers
ADD COLUMN IF NOT EXISTS workedge_customer_id TEXT;

-- Add WorkEdge fields to crm_locations
ALTER TABLE public.crm_locations
ADD COLUMN IF NOT EXISTS workedge_property_id TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workedge_sync_log_entity ON public.workedge_sync_log(entity_type, local_id);
CREATE INDEX IF NOT EXISTS idx_workedge_sync_log_status ON public.workedge_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_workedge_project_media_job ON public.workedge_project_media(job_id);

-- Enable RLS
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workedge_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workedge_project_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_configs (admin only)
CREATE POLICY "Admins can manage integration configs"
ON public.integration_configs FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for workedge_sync_log
CREATE POLICY "Admins can view sync logs"
ON public.workedge_sync_log FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert sync logs"
ON public.workedge_sync_log FOR INSERT
WITH CHECK (true);

-- RLS Policies for workedge_project_media
CREATE POLICY "Authenticated users can view project media"
ON public.workedge_project_media FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can manage project media"
ON public.workedge_project_media FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('admin', 'manager')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('admin', 'manager')
));

-- Seed default integration config for WorkEdge
INSERT INTO public.integration_configs (integration_name, config, is_active)
VALUES ('workedge', '{"api_url": "https://api.workedge.pro", "webhook_enabled": false}', false)
ON CONFLICT (integration_name) DO NOTHING;

-- Updated_at trigger for integration_configs
CREATE TRIGGER update_integration_configs_updated_at
BEFORE UPDATE ON public.integration_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();