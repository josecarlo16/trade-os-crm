
-- Create crm_email_log table
CREATE TABLE public.crm_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  template_id UUID,
  status TEXT NOT NULL DEFAULT 'sent',
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  resend_message_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create crm_email_templates table
CREATE TABLE public.crm_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  trigger_event TEXT,
  delay_hours INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for template_id
ALTER TABLE public.crm_email_log
  ADD CONSTRAINT crm_email_log_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.crm_email_templates(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.crm_email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for crm_email_log
CREATE POLICY "Admin/manager can view all emails"
  ON public.crm_email_log FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admin/manager can insert emails"
  ON public.crm_email_log FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admin/manager can update emails"
  ON public.crm_email_log FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admin/manager can delete emails"
  ON public.crm_email_log FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- RLS policies for crm_email_templates
CREATE POLICY "Admin/manager can view all templates"
  ON public.crm_email_templates FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admin/manager can insert templates"
  ON public.crm_email_templates FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admin/manager can update templates"
  ON public.crm_email_templates FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admin/manager can delete templates"
  ON public.crm_email_templates FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Updated_at triggers
CREATE TRIGGER update_crm_email_log_updated_at
  BEFORE UPDATE ON public.crm_email_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_email_templates_updated_at
  BEFORE UPDATE ON public.crm_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for crm_email_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_email_log;
