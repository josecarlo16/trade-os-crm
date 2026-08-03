-- Create form_source_tags junction table to link GHL tags to submission sources
CREATE TABLE public.form_source_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('ducted', 'ductless', 'contact', 'scanner', 'landing_page')),
  tag_id UUID NOT NULL REFERENCES public.ghl_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_type, tag_id)
);

-- Enable RLS
ALTER TABLE public.form_source_tags ENABLE ROW LEVEL SECURITY;

-- Admin can manage tag assignments
CREATE POLICY "Admins can manage form source tags"
ON public.form_source_tags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  )
);

-- Public can read tag assignments (needed for forms to fetch their tags)
CREATE POLICY "Anyone can read form source tags"
ON public.form_source_tags
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_form_source_tags_source_type ON public.form_source_tags(source_type);
CREATE INDEX idx_form_source_tags_tag_id ON public.form_source_tags(tag_id);