-- Phase 6 Part 2: Create tables, functions, and policies

-- Create is_super_admin security definer function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Create AI Configuration table
CREATE TABLE public.ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  provider text NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  api_key_secret_name text,
  temperature numeric(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens integer DEFAULT 2048,
  system_prompt text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create AI request logs table for monitoring
CREATE TABLE public.ai_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text,
  provider text NOT NULL,
  model text NOT NULL,
  action text,
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  status text DEFAULT 'success',
  error_message text,
  user_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create automations table
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}',
  conditions jsonb DEFAULT '[]',
  actions jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  run_count integer DEFAULT 0,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create automation_logs table
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
  trigger_event jsonb NOT NULL,
  actions_executed jsonb DEFAULT '[]',
  status text DEFAULT 'pending',
  error_message text,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_config (super_admin only)
CREATE POLICY "Super admins can view ai_config"
ON public.ai_config FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert ai_config"
ON public.ai_config FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update ai_config"
ON public.ai_config FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete ai_config"
ON public.ai_config FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for ai_request_logs
CREATE POLICY "Super admins can view ai_request_logs"
ON public.ai_request_logs FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for automations
CREATE POLICY "Admin and managers can view automations"
ON public.automations FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR
  public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can insert automations"
ON public.automations FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update automations"
ON public.automations FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete automations"
ON public.automations FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for automation_logs
CREATE POLICY "Admin and managers can view automation_logs"
ON public.automation_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR
  public.is_super_admin(auth.uid())
);

-- Create updated_at triggers
CREATE TRIGGER update_ai_config_updated_at
BEFORE UPDATE ON public.ai_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automations_updated_at
BEFORE UPDATE ON public.automations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default AI configuration
INSERT INTO public.ai_config (config_key, provider, model, system_prompt)
VALUES (
  'ai_assistant',
  'lovable',
  'google/gemini-2.5-flash',
  'You are a helpful AI assistant for Truficient HVAC CRM. You help staff manage customers, analyze interactions, draft follow-up messages, and suggest next actions. Be concise and professional.'
);

-- Create indexes for performance
CREATE INDEX idx_ai_request_logs_created_at ON public.ai_request_logs(created_at DESC);
CREATE INDEX idx_ai_request_logs_config_key ON public.ai_request_logs(config_key);
CREATE INDEX idx_automation_logs_automation_id ON public.automation_logs(automation_id);
CREATE INDEX idx_automation_logs_created_at ON public.automation_logs(created_at DESC);
CREATE INDEX idx_automations_trigger_type ON public.automations(trigger_type);
CREATE INDEX idx_automations_is_active ON public.automations(is_active);