
-- Nav permission
INSERT INTO public.role_permissions (role, permission_key, enabled)
VALUES
  ('admin'::app_role, 'nav.material-requests', true),
  ('manager'::app_role, 'nav.material-requests', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Bach notification on material_request submit (in-app, broadcast).
CREATE OR REPLACE FUNCTION public.notify_material_request_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    user_id, category, title, message, icon, color, link_url,
    related_entity_id, related_entity_type
  ) VALUES (
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
$$;

DROP TRIGGER IF EXISTS trg_notify_material_request_submitted ON public.material_requests;
CREATE TRIGGER trg_notify_material_request_submitted
AFTER INSERT OR UPDATE OF status ON public.material_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_material_request_submitted();
