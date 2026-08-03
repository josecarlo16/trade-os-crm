
-- =============================================
-- ADMIN TASKS TABLE
-- =============================================
CREATE TABLE public.admin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Polymorphic links
  customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.crm_jobs(id) ON DELETE SET NULL,
  submission_id UUID,
  submission_type TEXT,
  pipeline_entry_id UUID REFERENCES public.crm_pipeline_entries(id) ON DELETE SET NULL,
  -- Auto-generation tracking
  source TEXT DEFAULT 'manual',
  source_event TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_tasks_assigned_to ON public.admin_tasks(assigned_to);
CREATE INDEX idx_admin_tasks_status ON public.admin_tasks(status);
CREATE INDEX idx_admin_tasks_due_date ON public.admin_tasks(due_date);
CREATE INDEX idx_admin_tasks_created_by ON public.admin_tasks(created_by);

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own or assigned tasks, admins see all"
ON public.admin_tasks FOR SELECT TO authenticated
USING (
  assigned_to = auth.uid()
  OR created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can create tasks"
ON public.admin_tasks FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users update own or assigned tasks, admins update all"
ON public.admin_tasks FOR UPDATE TO authenticated
USING (
  assigned_to = auth.uid()
  OR created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users delete own tasks, admins delete all"
ON public.admin_tasks FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_admin_tasks_updated_at
BEFORE UPDATE ON public.admin_tasks
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- ADMIN NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('lead', 'pipeline', 'job', 'team', 'system', 'general')),
  title TEXT NOT NULL,
  message TEXT,
  icon TEXT,
  color TEXT,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  related_entity_id UUID,
  related_entity_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_notifications_user_id ON public.admin_notifications(user_id);
CREATE INDEX idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications and broadcasts"
ON public.admin_notifications FOR SELECT TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "System can insert notifications"
ON public.admin_notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users update own notifications"
ON public.admin_notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- =============================================
-- ADMIN NOTIFICATION PREFERENCES TABLE
-- =============================================
CREATE TABLE public.admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  lead_enabled BOOLEAN NOT NULL DEFAULT true,
  pipeline_enabled BOOLEAN NOT NULL DEFAULT true,
  job_enabled BOOLEAN NOT NULL DEFAULT true,
  team_enabled BOOLEAN NOT NULL DEFAULT true,
  system_enabled BOOLEAN NOT NULL DEFAULT true,
  general_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own preferences"
ON public.admin_notification_preferences FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own preferences"
ON public.admin_notification_preferences FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own preferences"
ON public.admin_notification_preferences FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_admin_notification_preferences_updated_at
BEFORE UPDATE ON public.admin_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- TRIGGERS FOR AUTO-NOTIFICATIONS
-- =============================================

-- Trigger function: new submission notification + auto-task
CREATE OR REPLACE FUNCTION public.notify_new_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_name TEXT;
  sub_type TEXT;
BEGIN
  -- Determine submission type from TG_TABLE_NAME
  CASE TG_TABLE_NAME
    WHEN 'contact_submissions' THEN
      sub_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
      sub_type := 'Contact';
    WHEN 'ductless_estimate_submissions' THEN
      sub_name := COALESCE(NEW.customer_name, 'Unknown');
      sub_type := 'Ductless';
    WHEN 'ducted_estimate_submissions' THEN
      sub_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
      sub_type := 'Ducted';
    ELSE
      sub_name := 'Unknown';
      sub_type := 'Other';
  END CASE;

  -- Broadcast notification (user_id = NULL)
  INSERT INTO public.admin_notifications (user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
  VALUES (NULL, 'lead', 'New ' || sub_type || ' Submission', TRIM(sub_name) || ' submitted a ' || LOWER(sub_type) || ' request', 'FileText', 'blue', '/admin/submissions', NEW.id, TG_TABLE_NAME);

  -- Auto-create task
  INSERT INTO public.admin_tasks (title, description, source, source_event, submission_id, submission_type)
  VALUES ('Review ' || sub_type || ' submission from ' || TRIM(sub_name), 'Auto-created from new ' || LOWER(sub_type) || ' submission', 'auto', 'new_submission', NEW.id, TG_TABLE_NAME);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_contact_submission
AFTER INSERT ON public.contact_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_new_submission();

CREATE TRIGGER trg_notify_ductless_submission
AFTER INSERT ON public.ductless_estimate_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_new_submission();

CREATE TRIGGER trg_notify_ducted_submission
AFTER INSERT ON public.ducted_estimate_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_new_submission();

-- Trigger function: pipeline stage change notification
CREATE OR REPLACE FUNCTION public.notify_pipeline_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stage_name TEXT;
  cust_name TEXT;
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    SELECT display_name INTO stage_name FROM public.crm_pipeline_stages WHERE id = NEW.stage_id;
    SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') INTO cust_name FROM public.crm_customers WHERE id = NEW.customer_id;
    
    INSERT INTO public.admin_notifications (user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
    VALUES (NULL, 'pipeline', 'Pipeline Stage Change', TRIM(cust_name) || ' moved to ' || COALESCE(stage_name, 'unknown'), 'Kanban', 'yellow', '/admin/pipeline', NEW.id, 'crm_pipeline_entries');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_pipeline_change
AFTER UPDATE ON public.crm_pipeline_entries
FOR EACH ROW EXECUTE FUNCTION public.notify_pipeline_change();

-- Trigger function: job stage change notification
CREATE OR REPLACE FUNCTION public.notify_job_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stage_name TEXT;
  cust_name TEXT;
BEGIN
  IF OLD.current_stage_id IS DISTINCT FROM NEW.current_stage_id AND NEW.current_stage_id IS NOT NULL THEN
    SELECT name INTO stage_name FROM public.crm_job_stages WHERE id = NEW.current_stage_id;
    SELECT COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') INTO cust_name FROM public.crm_customers c WHERE c.id = NEW.customer_id;
    
    INSERT INTO public.admin_notifications (user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
    VALUES (NULL, 'job', 'Job Stage Updated', NEW.job_number || ' (' || TRIM(cust_name) || ') → ' || COALESCE(stage_name, 'unknown'), 'Briefcase', 'green', '/admin/jobs/' || NEW.id, NEW.id, 'crm_jobs');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_job_stage_change
AFTER UPDATE ON public.crm_jobs
FOR EACH ROW EXECUTE FUNCTION public.notify_job_stage_change();

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_tasks;
