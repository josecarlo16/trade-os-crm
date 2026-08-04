// Single source of truth for which tables require tenant_id.
//
// MUST stay in sync with the `tenant_tables` array in
// supabase/migrations/20260803180000_multi_tenancy.sql — that migration is
// what actually adds the tenant_id column + RLS policy to each of these
// tables. If you add a new tenant-scoped table, add it in BOTH places.
export const TENANT_SCOPED_TABLE_LIST = [
  // customers / companies / locations
  'crm_customers', 'crm_customer_contacts', 'crm_customer_notes',
  'crm_customer_relationships', 'crm_companies', 'crm_locations',
  'crm_location_customers', 'crm_location_equipment',
  // jobs / pipeline / dispatch
  'crm_jobs', 'crm_job_types', 'crm_job_stages', 'crm_job_stage_history',
  'crm_job_assignments', 'crm_job_lists', 'crm_job_list_items',
  'crm_job_appointment_calendars', 'crm_pipeline_entries',
  'crm_pipeline_stages', 'job_equipment_installs', 'google_calendars',
  // maintenance contracts
  'crm_maintenance_contracts', 'crm_contract_tiers', 'crm_contract_filters',
  'crm_contract_visits', 'crm_contract_candidate_dismissals',
  // teams / timesheets
  'crm_teams', 'crm_team_members', 'crm_team_assignments',
  'crm_team_member_rate_history', 'time_entries',
  // suppliers / materials
  'crm_suppliers', 'crm_supplier_contacts', 'materials_catalog',
  'material_requests', 'material_request_items', 'material_suppliers',
  // estimates / pricing
  'estimates', 'estimate_line_items', 'estimate_templates',
  'estimate_template_items', 'estimate_versions', 'labor_rates',
  'price_books', 'financing_options', 'individual_equipment_pricing',
  // comms / marketing ops
  'crm_email_log', 'crm_email_templates', 'email_signatures',
  'crm_campaign_tags', 'lead_sources', 'form_source_tags',
  'crm_submission_links', 'crm_interactions',
  // social studio
  'crm_social_connections', 'crm_social_ideas', 'crm_social_post_targets',
  'crm_social_posts', 'crm_social_strategy',
  // automations / AI / knowledge base
  'automations', 'automation_logs', 'ai_config', 'ai_request_logs',
  'assistant_logs', 'knowledge_base', 'kb_articles', 'kb_categories',
  'kb_media',
  // admin / ops
  'role_permissions', 'admin_tasks', 'admin_notifications',
  'admin_notification_preferences', 'file_attachments', 'trash_bin',
  'integration_configs',
  // workedge integration
  'workedge_daily_sync_log', 'workedge_project_media', 'workedge_sync_log',
  // staff <-> tenant membership itself also requires tenant_id on insert
  'user_roles',
] as const;

export const TENANT_SCOPED_TABLES: ReadonlySet<string> = new Set(TENANT_SCOPED_TABLE_LIST);

export type TenantScopedTable = (typeof TENANT_SCOPED_TABLE_LIST)[number];
