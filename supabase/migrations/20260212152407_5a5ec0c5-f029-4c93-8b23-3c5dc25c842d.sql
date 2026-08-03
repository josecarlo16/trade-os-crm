
-- Create junction table for multi-calendar appointment syncing
CREATE TABLE public.crm_job_appointment_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.crm_job_appointments(id) ON DELETE CASCADE,
  google_calendar_db_id UUID NOT NULL REFERENCES public.google_calendars(id) ON DELETE CASCADE,
  google_calendar_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, google_calendar_db_id)
);

-- Enable RLS
ALTER TABLE public.crm_job_appointment_calendars ENABLE ROW LEVEL SECURITY;

-- RLS policies matching existing crm_job_appointments pattern (authenticated users)
CREATE POLICY "Authenticated users can view appointment calendars"
  ON public.crm_job_appointment_calendars FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert appointment calendars"
  ON public.crm_job_appointment_calendars FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update appointment calendars"
  ON public.crm_job_appointment_calendars FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete appointment calendars"
  ON public.crm_job_appointment_calendars FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Migrate existing data from crm_job_appointments
INSERT INTO public.crm_job_appointment_calendars (appointment_id, google_calendar_db_id, google_calendar_event_id)
SELECT id, google_calendar_id, google_calendar_event_id
FROM public.crm_job_appointments
WHERE google_calendar_id IS NOT NULL;
