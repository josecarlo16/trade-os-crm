
-- Create assistant_logs table for AI interaction audit logging
CREATE TABLE IF NOT EXISTS public.assistant_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_message TEXT NOT NULL,
  assistant_response TEXT,
  tools_used JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistant_logs ENABLE ROW LEVEL SECURITY;

-- Admins/super_admins can view all logs
CREATE POLICY "Admins can view assistant logs"
  ON public.assistant_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Authenticated users can insert their own logs
CREATE POLICY "Users can insert own assistant logs"
  ON public.assistant_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_assistant_logs_user_id ON public.assistant_logs(user_id);
CREATE INDEX idx_assistant_logs_created_at ON public.assistant_logs(created_at DESC);

COMMENT ON TABLE public.assistant_logs IS 'Logs all AI assistant interactions for audit and debugging';
