-- Multi-tenancy foundation for Trade-OS CRM.
--
-- This repo was forked from Truficient's single-tenant admin CRM. Before a
-- second contractor can be onboarded, every CRM data table needs a tenant
-- boundary. This migration:
--   1. Creates `tenants` (one row per contractor company using Trade-OS).
--   2. Adds `tenant_id` to `user_roles` so staff are scoped to one tenant.
--   3. Adds a SECURITY DEFINER helper `get_current_tenant_id()` (same
--      recursion-safe pattern as the existing `has_role`/`get_user_role`
--      functions) so RLS policies never recurse into the tables they guard.
--   4. Backfills all existing (Truficient) data into a single default
--      tenant, then adds `tenant_id` + tenant-isolation RLS to every
--      CRM/ops table the app actually uses.
--
-- NOT included: public marketing/SEO/blog/scanner/calculator tables. Those
-- were left over from the wholesale copy of Truficient's schema and are out
-- of scope for the multi-tenant CRM core (see README.md).
--
-- This migration has not been run against any live database yet — a fresh
-- Supabase project needs to be created first (see README.md "Setup").

-- ============================================================================
-- 1. Tenants table
-- ============================================================================

CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. Tenant membership on user_roles + current-tenant helper
-- ============================================================================

ALTER TABLE public.user_roles
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE POLICY "Users can view their own tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.get_current_tenant_id());

-- ============================================================================
-- 3. Backfill: create the default tenant for Truficient's existing data
-- ============================================================================

DO $migration$
DECLARE
  default_tenant_id UUID;
  tbl TEXT;
  pol RECORD;
  tenant_tables TEXT[] := ARRAY[
    -- customers / companies / locations
    'crm_customers', 'crm_customer_contacts', 'crm_customer_notes',
    'crm_customer_relationships', 'crm_companies', 'crm_locations',
    'crm_location_customers', 'crm_location_equipment',
    -- jobs / pipeline / dispatch
    'crm_jobs', 'crm_job_types', 'crm_job_stages', 'crm_job_stage_history',
    'crm_job_assignments', 'crm_job_lists', 'crm_job_list_items',
    'crm_job_appointment_calendars', 'crm_pipeline_entries',
    'crm_pipeline_stages', 'job_equipment_installs', 'google_calendars',
    -- maintenance contracts
    'crm_maintenance_contracts', 'crm_contract_tiers', 'crm_contract_filters',
    'crm_contract_visits', 'crm_contract_candidate_dismissals',
    -- teams / timesheets
    'crm_teams', 'crm_team_members', 'crm_team_assignments',
    'crm_team_member_rate_history', 'time_entries',
    -- suppliers / materials
    'crm_suppliers', 'crm_supplier_contacts', 'materials_catalog',
    'material_requests', 'material_request_items', 'material_suppliers',
    -- estimates / pricing
    'estimates', 'estimate_line_items', 'estimate_templates',
    'estimate_template_items', 'estimate_versions', 'labor_rates',
    'price_books', 'financing_options', 'individual_equipment_pricing',
    -- invoicing lives in its own tables managed elsewhere in this schema;
    -- add here once confirmed during the invoicing integration pass
    -- comms / marketing ops
    'crm_email_log', 'crm_email_templates', 'email_signatures',
    'crm_campaign_tags', 'lead_sources', 'form_source_tags',
    'crm_submission_links', 'crm_interactions',
    -- social studio
    'crm_social_connections', 'crm_social_ideas', 'crm_social_post_targets',
    'crm_social_posts', 'crm_social_strategy',
    -- automations / AI / knowledge base
    'automations', 'automation_logs', 'ai_config', 'ai_request_logs',
    'assistant_logs', 'knowledge_base', 'kb_articles', 'kb_categories',
    'kb_media',
    -- admin / ops
    'role_permissions', 'admin_tasks', 'admin_notifications',
    'admin_notification_preferences', 'file_attachments', 'trash_bin',
    'integration_configs',
    -- workedge integration
    'workedge_daily_sync_log', 'workedge_project_media', 'workedge_sync_log'
  ];
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES ('Truficient', 'truficient')
  RETURNING id INTO default_tenant_id;

  UPDATE public.user_roles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  FOREACH tbl IN ARRAY tenant_tables
  LOOP
    -- Add the column (skip tables that don't exist in this checkout yet).
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id)', tbl);
      EXECUTE format('UPDATE public.%I SET tenant_id = $1 WHERE tenant_id IS NULL', tbl) USING default_tenant_id;
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', tbl);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', tbl || '_tenant_id_idx', tbl);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      -- Replace whatever ad-hoc (single-tenant, "true"-condition) policies
      -- existed with a single tenant-isolation policy.
      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL TO authenticated USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id())',
        tbl
      );
    ELSE
      RAISE NOTICE 'Skipping %: table does not exist in this checkout', tbl;
    END IF;
  END LOOP;
END $migration$;
