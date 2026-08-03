-- Phase 3: Teams & Crew Enhancement
-- Add missing columns to crm_teams
ALTER TABLE public.crm_teams
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS max_concurrent_jobs INTEGER DEFAULT 1;

-- Add missing columns to crm_team_members
ALTER TABLE public.crm_team_members
ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'technician',
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS license_expiry DATE,
ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS default_availability JSONB,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS workedge_user_id TEXT;

-- Add missing columns to crm_job_assignments
ALTER TABLE public.crm_job_assignments
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'assigned',
ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(5,1);

-- Add check constraint for member_type
ALTER TABLE public.crm_team_members
DROP CONSTRAINT IF EXISTS crm_team_members_member_type_check;

ALTER TABLE public.crm_team_members
ADD CONSTRAINT crm_team_members_member_type_check 
CHECK (member_type IN ('technician', 'installer', 'lead_installer', 'apprentice', 'subcontractor', 'helper'));

-- Add check constraint for role
ALTER TABLE public.crm_job_assignments
DROP CONSTRAINT IF EXISTS crm_job_assignments_role_check;

ALTER TABLE public.crm_job_assignments
ADD CONSTRAINT crm_job_assignments_role_check 
CHECK (role IN ('lead', 'assigned', 'support', 'subcontractor'));

-- Add index for license expiry alerts
CREATE INDEX IF NOT EXISTS idx_crm_team_members_license_expiry 
ON public.crm_team_members(license_expiry) 
WHERE license_expiry IS NOT NULL;

-- Update crm_team_assignments to add role_in_team if not exists
ALTER TABLE public.crm_team_assignments
ADD COLUMN IF NOT EXISTS role_in_team TEXT DEFAULT 'member';

ALTER TABLE public.crm_team_assignments
DROP CONSTRAINT IF EXISTS crm_team_assignments_role_check;

ALTER TABLE public.crm_team_assignments
ADD CONSTRAINT crm_team_assignments_role_in_team_check 
CHECK (role_in_team IN ('lead', 'member', 'backup'));