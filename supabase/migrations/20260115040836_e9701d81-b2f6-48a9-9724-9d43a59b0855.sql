-- Create ghl_tags table for storing GoHighLevel tags
CREATE TABLE public.ghl_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tag_value TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create landing_page_forms table for form configurations
CREATE TABLE public.landing_page_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  form_type TEXT NOT NULL DEFAULT 'contact',
  fields_config JSONB NOT NULL DEFAULT '{"firstName": true, "lastName": true, "email": true, "phone": true, "serviceType": true, "message": true}'::jsonb,
  success_message TEXT DEFAULT 'Thank you for your submission! We will be in touch soon.',
  redirect_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for form-tag relationships
CREATE TABLE public.landing_page_form_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.landing_page_forms(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.ghl_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(form_id, tag_id)
);

-- Create landing_page_submissions table for form submissions
CREATE TABLE public.landing_page_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES public.landing_page_forms(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_type TEXT,
  message TEXT,
  custom_fields JSONB,
  ghl_contact_id TEXT,
  ghl_sync_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ghl_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_form_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ghl_tags
CREATE POLICY "Anyone can view active ghl_tags" 
ON public.ghl_tags 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage ghl_tags" 
ON public.ghl_tags 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for landing_page_forms
CREATE POLICY "Anyone can view active landing_page_forms" 
ON public.landing_page_forms 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage landing_page_forms" 
ON public.landing_page_forms 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for landing_page_form_tags
CREATE POLICY "Anyone can view landing_page_form_tags" 
ON public.landing_page_form_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage landing_page_form_tags" 
ON public.landing_page_form_tags 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for landing_page_submissions
CREATE POLICY "Anyone can insert landing_page_submissions" 
ON public.landing_page_submissions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view landing_page_submissions" 
ON public.landing_page_submissions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update landing_page_submissions" 
ON public.landing_page_submissions 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete landing_page_submissions" 
ON public.landing_page_submissions 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at triggers
CREATE TRIGGER update_ghl_tags_updated_at
BEFORE UPDATE ON public.ghl_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landing_page_forms_updated_at
BEFORE UPDATE ON public.landing_page_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landing_page_submissions_updated_at
BEFORE UPDATE ON public.landing_page_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default GHL tags
INSERT INTO public.ghl_tags (name, tag_value, description, color) VALUES
('Website Lead', 'website-lead', 'General lead from website', '#3b82f6'),
('AC Repair Lead', 'ac-repair-lead', 'Lead interested in AC repair', '#ef4444'),
('Heating Lead', 'heating-lead', 'Lead interested in heating services', '#f97316'),
('New Installation', 'new-installation', 'Lead interested in new HVAC installation', '#22c55e'),
('Maintenance Request', 'maintenance-request', 'Lead requesting maintenance service', '#8b5cf6');