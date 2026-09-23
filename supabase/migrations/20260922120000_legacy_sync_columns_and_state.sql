-- Ongoing delta sync from the old Lovable-managed database (source) into
-- this project's own Supabase (target), so the local dashboard can stay
-- close to live without repeating a full manual migration each time.
--
-- Source only has 3 tables reachable via its sync_export_changes() RPC:
-- projects, customers, notifications (admin_tasks/contact_submissions don't
-- exist there). Mapped onto: crm_jobs, crm_customers, admin_notifications.
--
-- legacy_sync_source_id lets every sync run be a safe upsert — reruns never
-- duplicate rows, matching (tenant_id, legacy_sync_source_id).

ALTER TABLE public.crm_jobs ADD COLUMN IF NOT EXISTS legacy_sync_source_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_jobs_legacy_sync
  ON public.crm_jobs (tenant_id, legacy_sync_source_id) WHERE legacy_sync_source_id IS NOT NULL;

ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS legacy_sync_source_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_customers_legacy_sync
  ON public.crm_customers (tenant_id, legacy_sync_source_id) WHERE legacy_sync_source_id IS NOT NULL;

ALTER TABLE public.admin_notifications ADD COLUMN IF NOT EXISTS legacy_sync_source_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_notifications_legacy_sync
  ON public.admin_notifications (tenant_id, legacy_sync_source_id) WHERE legacy_sync_source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.legacy_sync_state (
  source_table TEXT NOT NULL PRIMARY KEY,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT '2000-01-01'::timestamptz,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legacy_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage legacy sync state"
  ON public.legacy_sync_state FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.legacy_sync_state (source_table) VALUES ('projects'), ('customers'), ('notifications')
ON CONFLICT (source_table) DO NOTHING;
