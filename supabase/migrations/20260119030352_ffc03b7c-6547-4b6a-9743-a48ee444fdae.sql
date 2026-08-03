-- Create trash_bin table for soft delete functionality
CREATE TABLE public.trash_bin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_table text NOT NULL,
  original_id uuid NOT NULL,
  data jsonb NOT NULL,
  deleted_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  
  CONSTRAINT unique_original UNIQUE (original_table, original_id)
);

-- Enable RLS
ALTER TABLE public.trash_bin ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view trash" ON public.trash_bin
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can add to trash" ON public.trash_bin
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can restore from trash" ON public.trash_bin
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add index for faster lookups
CREATE INDEX idx_trash_bin_original ON public.trash_bin(original_table, original_id);
CREATE INDEX idx_trash_bin_expires ON public.trash_bin(expires_at);