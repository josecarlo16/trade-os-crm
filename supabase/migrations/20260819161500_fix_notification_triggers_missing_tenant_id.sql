-- Every admin-notification trigger function inserted into admin_notifications
-- without setting tenant_id, which became a required NOT NULL column once
-- multi-tenancy was added. Left unfixed, ANY real stage change, pipeline move,
-- new submission, maintenance contract/visit, or material request submission
-- would fail outright with a not-null constraint violation. Discovered while
-- backfilling migrated data and hitting exactly this error.

CREATE OR REPLACE FUNCTION public.notify_job_stage_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stage_name TEXT;
  cust_name TEXT;
BEGIN
  IF OLD.current_stage_id IS DISTINCT FROM NEW.current_stage_id AND NEW.current_stage_id IS NOT NULL THEN
    SELECT name INTO stage_name FROM public.crm_job_stages WHERE id = NEW.current_stage_id;
    SELECT COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') INTO cust_name FROM public.crm_customers c WHERE c.id = NEW.customer_id;

    INSERT INTO public.admin_notifications (tenant_id, user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
    VALUES (NEW.tenant_id, NULL, 'job', 'Job Stage Updated', NEW.job_number || ' (' || TRIM(cust_name) || ') -> ' || COALESCE(stage_name, 'unknown'), 'Briefcase', 'green', '/admin/jobs/' || NEW.id, NEW.id, 'crm_jobs');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_pipeline_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stage_name TEXT;
  cust_name TEXT;
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    SELECT display_name INTO stage_name FROM public.crm_pipeline_stages WHERE id = NEW.stage_id;
    SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') INTO cust_name FROM public.crm_customers WHERE id = NEW.customer_id;

    INSERT INTO public.admin_notifications (tenant_id, user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
    VALUES (NEW.tenant_id, NULL, 'pipeline', 'Pipeline Stage Change', TRIM(cust_name) || ' moved to ' || COALESCE(stage_name, 'unknown'), 'Kanban', 'yellow', '/admin/pipeline', NEW.id, 'crm_pipeline_entries');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub_name TEXT;
  sub_type TEXT;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'contact_submissions' THEN
      sub_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
      sub_type := 'Contact';
    WHEN 'ductless_estimate_submissions' THEN
      sub_name := COALESCE(NEW.customer_name, 'Unknown');
      sub_type := 'Ductless';
    WHEN 'ducted_estimate_submissions' THEN
      sub_name := COALESCE(NEW.customer_name, 'Unknown');
      sub_type := 'Ducted';
    WHEN 'landing_page_submissions' THEN
      sub_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
      sub_type := 'Landing Page';
    ELSE
      sub_name := 'Unknown';
      sub_type := 'Other';
  END CASE;

  INSERT INTO public.admin_notifications (tenant_id, user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
  VALUES (NEW.tenant_id, NULL, 'lead', 'New ' || sub_type || ' Submission', TRIM(sub_name) || ' submitted a ' || LOWER(sub_type) || ' request', 'FileText', 'blue', '/admin/submissions', NEW.id, TG_TABLE_NAME);

  INSERT INTO public.admin_tasks (tenant_id, title, description, source, source_event, submission_id, submission_type)
  VALUES (NEW.tenant_id, 'Review ' || sub_type || ' submission from ' || TRIM(sub_name), 'Auto-created from new ' || LOWER(sub_type) || ' submission', 'auto', 'new_submission', NEW.id, TG_TABLE_NAME);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_maintenance_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cust_name text;
BEGIN
  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    INTO cust_name
  FROM public.crm_customers WHERE id = NEW.customer_id;

  INSERT INTO public.admin_notifications (tenant_id, user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
  VALUES (NEW.tenant_id, NULL, 'maintenance', 'New Maintenance Contract',
          NEW.contract_number || ' created for ' || COALESCE(NULLIF(cust_name, ''), 'customer'),
          'Wrench', 'amber', '/admin/contracts/' || NEW.id, NEW.id, 'crm_maintenance_contracts');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_maintenance_visit_logged()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cust_name text;
  c_number text;
  cust_id uuid;
BEGIN
  SELECT mc.customer_id, mc.contract_number INTO cust_id, c_number
  FROM public.crm_maintenance_contracts mc WHERE mc.id = NEW.contract_id;

  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    INTO cust_name
  FROM public.crm_customers WHERE id = cust_id;

  INSERT INTO public.admin_notifications (tenant_id, user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
  VALUES (NEW.tenant_id, NULL, 'maintenance', 'Maintenance Visit Logged',
          'Visit on ' || to_char(NEW.visit_date, 'Mon DD') || ' for ' || COALESCE(NULLIF(cust_name, ''), 'customer') || ' (' || COALESCE(c_number, '') || ')',
          'Wrench', 'green', '/admin/contracts/' || NEW.contract_id, NEW.contract_id, 'crm_maintenance_contracts');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_material_request_submitted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_job_number text;
  v_job_title  text;
  v_requester  text;
  v_item_count int;
BEGIN
  IF NEW.status::text <> 'submitted' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT j.job_number, j.title INTO v_job_number, v_job_title
  FROM public.crm_jobs j WHERE j.id = NEW.job_id;

  SELECT TRIM(COALESCE(tm.first_name,'') || ' ' || COALESCE(tm.last_name,''))
    INTO v_requester
  FROM public.crm_team_members tm
  WHERE tm.user_id = NEW.requested_by
  LIMIT 1;

  SELECT COUNT(*) INTO v_item_count
  FROM public.material_request_items WHERE request_id = NEW.id;

  INSERT INTO public.admin_notifications (
    tenant_id, user_id, category, title, message, icon, color, link_url,
    related_entity_id, related_entity_type
  ) VALUES (
    NEW.tenant_id,
    NULL,
    'material',
    'Material List Ready for Review',
    COALESCE(NULLIF(v_requester,''), 'A team member')
      || ' submitted "' || COALESCE(NEW.list_name,'Material List') || '"'
      || CASE WHEN v_job_number IS NOT NULL THEN ' for ' || v_job_number ELSE '' END
      || ' (' || v_item_count || ' items)',
    'ClipboardList',
    'amber',
    '/admin/material-requests/' || NEW.id,
    NEW.id,
    'material_requests'
  );

  RETURN NEW;
END;
$function$;
