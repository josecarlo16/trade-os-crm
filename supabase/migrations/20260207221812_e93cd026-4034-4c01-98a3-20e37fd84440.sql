-- Phase 5: Google Calendar Integration

-- Create google_calendars table to store synced calendars
CREATE TABLE public.google_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#4285f4',
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  linked_job_type_id UUID REFERENCES public.crm_job_types(id) ON DELETE SET NULL,
  linked_team_id UUID REFERENCES public.crm_teams(id) ON DELETE SET NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add Google Calendar columns to crm_jobs
ALTER TABLE public.crm_jobs 
ADD COLUMN google_calendar_event_id TEXT,
ADD COLUMN google_calendar_id UUID REFERENCES public.google_calendars(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_crm_jobs_google_calendar_event_id ON public.crm_jobs(google_calendar_event_id);
CREATE INDEX idx_google_calendars_calendar_id ON public.google_calendars(calendar_id);

-- Enable RLS on google_calendars
ALTER TABLE public.google_calendars ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can view, admin/manager can modify
CREATE POLICY "Authenticated users can view calendars"
  ON public.google_calendars
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and manager can insert calendars"
  ON public.google_calendars
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can update calendars"
  ON public.google_calendars
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can delete calendars"
  ON public.google_calendars
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Trigger for updated_at
CREATE TRIGGER update_google_calendars_updated_at
  BEFORE UPDATE ON public.google_calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();