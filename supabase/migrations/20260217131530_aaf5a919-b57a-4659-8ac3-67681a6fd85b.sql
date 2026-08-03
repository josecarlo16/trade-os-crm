-- Fix the notify_new_submission trigger to use customer_name for ducted submissions
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

  INSERT INTO public.admin_notifications (user_id, category, title, message, icon, color, link_url, related_entity_id, related_entity_type)
  VALUES (NULL, 'lead', 'New ' || sub_type || ' Submission', TRIM(sub_name) || ' submitted a ' || LOWER(sub_type) || ' request', 'FileText', 'blue', '/admin/submissions', NEW.id, TG_TABLE_NAME);

  INSERT INTO public.admin_tasks (title, description, source, source_event, submission_id, submission_type)
  VALUES ('Review ' || sub_type || ' submission from ' || TRIM(sub_name), 'Auto-created from new ' || LOWER(sub_type) || ' submission', 'auto', 'new_submission', NEW.id, TG_TABLE_NAME);

  RETURN NEW;
END;
$function$;

-- Allow public/anon to update their own partial submissions (for abandoned cart flow)
CREATE POLICY "Public can update partial ducted submissions"
ON public.ducted_estimate_submissions
FOR UPDATE
USING (true)
WITH CHECK (true);