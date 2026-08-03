-- ============================================
-- PHASE 2: OPERATIONS - DATABASE SCHEMA
-- ============================================

-- ============================================
-- 1. JOB TYPES TABLE
-- ============================================
CREATE TABLE public.crm_job_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'residential' CHECK (category IN ('residential', 'commercial')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  default_duration_hours DECIMAL(5,2) DEFAULT 2.0,
  default_priority TEXT DEFAULT 'normal' CHECK (default_priority IN ('low', 'normal', 'high', 'urgent')),
  requires_permit BOOLEAN DEFAULT false,
  icon_name TEXT DEFAULT 'Wrench',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_job_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job types"
  ON public.crm_job_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage job types"
  ON public.crm_job_types FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. JOB STAGES TABLE (per job type)
-- ============================================
CREATE TABLE public.crm_job_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type_id UUID NOT NULL REFERENCES public.crm_job_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage_type TEXT NOT NULL DEFAULT 'in_progress' CHECK (stage_type IN ('initial', 'in_progress', 'review', 'completed', 'cancelled')),
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  auto_notify_customer BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_job_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job stages"
  ON public.crm_job_stages FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage job stages"
  ON public.crm_job_stages FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. TEAMS TABLE
-- ============================================
CREATE TABLE public.crm_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_type TEXT NOT NULL DEFAULT 'install' CHECK (team_type IN ('install', 'service', 'sales', 'subcontractor')),
  description TEXT,
  color TEXT DEFAULT '#10B981',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view teams"
  ON public.crm_teams FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage teams"
  ON public.crm_teams FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE public.crm_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'technician' CHECK (role IN ('lead', 'technician', 'apprentice', 'helper')),
  certifications TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view team members"
  ON public.crm_team_members FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can insert team members"
  ON public.crm_team_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins and managers can update team members"
  ON public.crm_team_members FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins can delete team members"
  ON public.crm_team_members FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 5. TEAM ASSIGNMENTS (member to team)
-- ============================================
CREATE TABLE public.crm_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.crm_teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.crm_team_members(id) ON DELETE CASCADE,
  is_lead BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, member_id)
);

ALTER TABLE public.crm_team_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view team assignments"
  ON public.crm_team_assignments FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage team assignments"
  ON public.crm_team_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  ));

-- ============================================
-- 6. JOBS TABLE
-- ============================================
CREATE TABLE public.crm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE,
  job_type_id UUID NOT NULL REFERENCES public.crm_job_types(id),
  current_stage_id UUID REFERENCES public.crm_job_stages(id),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id),
  location_id UUID REFERENCES public.crm_locations(id),
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  quoted_amount DECIMAL(12,2),
  final_amount DECIMAL(12,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'deposit_received', 'partial', 'paid', 'refunded')),
  internal_notes TEXT,
  customer_notes TEXT,
  source_estimate_id UUID,
  source_pipeline_id UUID,
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view jobs"
  ON public.crm_jobs FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins and managers can insert jobs"
  ON public.crm_jobs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins and managers can update jobs"
  ON public.crm_jobs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins can delete jobs"
  ON public.crm_jobs FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 7. JOB STAGE HISTORY (audit trail)
-- ============================================
CREATE TABLE public.crm_job_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.crm_jobs(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.crm_job_stages(id),
  to_stage_id UUID NOT NULL REFERENCES public.crm_job_stages(id),
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_job_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job stage history"
  ON public.crm_job_stage_history FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can insert job stage history"
  ON public.crm_job_stage_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  ));

-- ============================================
-- 8. JOB ASSIGNMENTS (team/member to job)
-- ============================================
CREATE TABLE public.crm_job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.crm_jobs(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.crm_teams(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.crm_team_members(id) ON DELETE SET NULL,
  assignment_type TEXT DEFAULT 'assigned' CHECK (assignment_type IN ('assigned', 'lead', 'helper')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_job_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job assignments"
  ON public.crm_job_assignments FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage job assignments"
  ON public.crm_job_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager')
  ));

-- ============================================
-- JOB NUMBER AUTO-GENERATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_job_number TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(job_number, '^TRU-' || current_year || '-', ''), job_number)::INTEGER
  ), 0) + 1
  INTO next_number
  FROM public.crm_jobs
  WHERE job_number LIKE 'TRU-' || current_year || '-%';
  
  new_job_number := 'TRU-' || current_year || '-' || lpad(next_number::TEXT, 4, '0');
  
  RETURN new_job_number;
END;
$$;

-- Trigger to auto-set job number
CREATE OR REPLACE FUNCTION public.set_job_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := public.generate_job_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_job_number_trigger
  BEFORE INSERT ON public.crm_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_job_number();

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_crm_job_types_updated_at
  BEFORE UPDATE ON public.crm_job_types
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crm_job_stages_updated_at
  BEFORE UPDATE ON public.crm_job_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crm_teams_updated_at
  BEFORE UPDATE ON public.crm_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crm_team_members_updated_at
  BEFORE UPDATE ON public.crm_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crm_jobs_updated_at
  BEFORE UPDATE ON public.crm_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- SEED DEFAULT JOB TYPES AND STAGES
-- ============================================

-- Residential Job Types
INSERT INTO public.crm_job_types (category, name, slug, default_duration_hours, requires_permit, icon_name, color, sort_order) VALUES
('residential', 'Service Call', 'residential-service-call', 2.0, false, 'Wrench', '#3B82F6', 1),
('residential', 'Installation', 'residential-installation', 8.0, true, 'Package', '#10B981', 2),
('residential', 'Inspection', 'residential-inspection', 1.0, false, 'ClipboardCheck', '#F59E0B', 3),
('residential', 'Maintenance', 'residential-maintenance', 1.5, false, 'Settings', '#8B5CF6', 4),
('residential', 'Custom Home', 'residential-custom-home', 16.0, true, 'Home', '#EC4899', 5);

-- Commercial Job Types
INSERT INTO public.crm_job_types (category, name, slug, default_duration_hours, requires_permit, icon_name, color, sort_order) VALUES
('commercial', 'Service Call', 'commercial-service-call', 3.0, false, 'Wrench', '#0EA5E9', 6),
('commercial', 'Installation', 'commercial-installation', 16.0, true, 'Package', '#22C55E', 7),
('commercial', 'Project', 'commercial-project', 40.0, true, 'Building', '#EF4444', 8),
('commercial', 'Inspection', 'commercial-inspection', 2.0, false, 'ClipboardCheck', '#F97316', 9),
('commercial', 'Maintenance', 'commercial-maintenance', 3.0, false, 'Settings', '#A855F7', 10);

-- Stages for Residential Service Call
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Scheduled', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'residential-service-call';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'En Route', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'residential-service-call';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'On Site', 'in_progress', '#8B5CF6', 3 FROM public.crm_job_types WHERE slug = 'residential-service-call';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 4 FROM public.crm_job_types WHERE slug = 'residential-service-call';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 5 FROM public.crm_job_types WHERE slug = 'residential-service-call';

-- Stages for Residential Installation
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Permit & Planning', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'residential-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Materials Ordered', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'residential-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Crew Assigned', 'in_progress', '#8B5CF6', 3 FROM public.crm_job_types WHERE slug = 'residential-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Install Day 1', 'in_progress', '#0EA5E9', 4 FROM public.crm_job_types WHERE slug = 'residential-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Install Day 2', 'in_progress', '#0EA5E9', 5 FROM public.crm_job_types WHERE slug = 'residential-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'QA Inspection', 'review', '#F97316', 6 FROM public.crm_job_types WHERE slug = 'residential-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'City Inspection', 'review', '#EC4899', 7 FROM public.crm_job_types WHERE slug = 'residential-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Customer Walkthrough', 'review', '#A855F7', 8 FROM public.crm_job_types WHERE slug = 'residential-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 9 FROM public.crm_job_types WHERE slug = 'residential-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 10 FROM public.crm_job_types WHERE slug = 'residential-installation';

-- Stages for Residential Inspection
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Scheduled', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'residential-inspection';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'In Progress', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'residential-inspection';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Report Pending', 'review', '#8B5CF6', 3 FROM public.crm_job_types WHERE slug = 'residential-inspection';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 4 FROM public.crm_job_types WHERE slug = 'residential-inspection';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 5 FROM public.crm_job_types WHERE slug = 'residential-inspection';

-- Stages for Residential Maintenance  
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Scheduled', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'residential-maintenance';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'In Progress', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'residential-maintenance';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 3 FROM public.crm_job_types WHERE slug = 'residential-maintenance';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 4 FROM public.crm_job_types WHERE slug = 'residential-maintenance';

-- Stages for Residential Custom Home
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Design Review', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'residential-custom-home';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Permit & Planning', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'residential-custom-home';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Rough-In', 'in_progress', '#8B5CF6', 3 FROM public.crm_job_types WHERE slug = 'residential-custom-home';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Rough-In Inspection', 'review', '#0EA5E9', 4 FROM public.crm_job_types WHERE slug = 'residential-custom-home';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Trim-Out', 'in_progress', '#EC4899', 5 FROM public.crm_job_types WHERE slug = 'residential-custom-home';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Final Inspection', 'review', '#F97316', 6 FROM public.crm_job_types WHERE slug = 'residential-custom-home';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 7 FROM public.crm_job_types WHERE slug = 'residential-custom-home';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 8 FROM public.crm_job_types WHERE slug = 'residential-custom-home';

-- Stages for Commercial Service Call
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Scheduled', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'commercial-service-call';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'En Route', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'commercial-service-call';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'On Site', 'in_progress', '#8B5CF6', 3 FROM public.crm_job_types WHERE slug = 'commercial-service-call';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 4 FROM public.crm_job_types WHERE slug = 'commercial-service-call';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 5 FROM public.crm_job_types WHERE slug = 'commercial-service-call';

-- Stages for Commercial Installation
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Site Survey', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'commercial-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Permit & Planning', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'commercial-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Materials Staged', 'in_progress', '#8B5CF6', 3 FROM public.crm_job_types WHERE slug = 'commercial-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Installation', 'in_progress', '#0EA5E9', 4 FROM public.crm_job_types WHERE slug = 'commercial-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'QA Inspection', 'review', '#EC4899', 5 FROM public.crm_job_types WHERE slug = 'commercial-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'City Inspection', 'review', '#F97316', 6 FROM public.crm_job_types WHERE slug = 'commercial-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 7 FROM public.crm_job_types WHERE slug = 'commercial-installation';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 8 FROM public.crm_job_types WHERE slug = 'commercial-installation';

-- Stages for Commercial Project
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Project Kickoff', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'commercial-project';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Engineering', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'commercial-project';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Permits', 'in_progress', '#8B5CF6', 3 FROM public.crm_job_types WHERE slug = 'commercial-project';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Procurement', 'in_progress', '#0EA5E9', 4 FROM public.crm_job_types WHERE slug = 'commercial-project';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Phase 1 Install', 'in_progress', '#EC4899', 5 FROM public.crm_job_types WHERE slug = 'commercial-project';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Phase 2 Install', 'in_progress', '#A855F7', 6 FROM public.crm_job_types WHERE slug = 'commercial-project';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Commissioning', 'review', '#F97316', 7 FROM public.crm_job_types WHERE slug = 'commercial-project';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Final Inspection', 'review', '#22C55E', 8 FROM public.crm_job_types WHERE slug = 'commercial-project';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 9 FROM public.crm_job_types WHERE slug = 'commercial-project';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 10 FROM public.crm_job_types WHERE slug = 'commercial-project';

-- Stages for Commercial Inspection
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Scheduled', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'commercial-inspection';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'In Progress', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'commercial-inspection';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Report Pending', 'review', '#8B5CF6', 3 FROM public.crm_job_types WHERE slug = 'commercial-inspection';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 4 FROM public.crm_job_types WHERE slug = 'commercial-inspection';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 5 FROM public.crm_job_types WHERE slug = 'commercial-inspection';

-- Stages for Commercial Maintenance
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Scheduled', 'initial', '#3B82F6', 1 FROM public.crm_job_types WHERE slug = 'commercial-maintenance';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'In Progress', 'in_progress', '#F59E0B', 2 FROM public.crm_job_types WHERE slug = 'commercial-maintenance';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Complete', 'completed', '#10B981', 3 FROM public.crm_job_types WHERE slug = 'commercial-maintenance';
INSERT INTO public.crm_job_stages (job_type_id, name, stage_type, color, sort_order) 
SELECT id, 'Cancelled', 'cancelled', '#EF4444', 4 FROM public.crm_job_types WHERE slug = 'commercial-maintenance';