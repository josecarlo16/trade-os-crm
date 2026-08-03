
-- Create storage bucket for file attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);

-- Create file attachments table
CREATE TABLE public.file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  entity_type TEXT NOT NULL, -- 'customer', 'estimate', 'job'
  entity_id UUID NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for file_attachments
CREATE POLICY "Admins can manage file attachments" ON public.file_attachments
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- Storage RLS policies for attachments bucket
CREATE POLICY "Admins can upload attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Admins can view attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attachments' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Admins can delete attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'attachments' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );
