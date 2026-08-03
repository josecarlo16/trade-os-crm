ALTER TABLE public.crm_email_log ADD COLUMN cc_emails text DEFAULT null;
ALTER TABLE public.crm_email_templates ADD COLUMN cc_emails text DEFAULT null;