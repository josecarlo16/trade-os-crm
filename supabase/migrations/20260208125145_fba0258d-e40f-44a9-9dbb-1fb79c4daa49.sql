-- Add date-only columns to crm_jobs for high-level scheduling
ALTER TABLE crm_jobs 
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_end_date DATE;

-- Migrate existing data from timestamptz to date
UPDATE crm_jobs 
SET scheduled_date = DATE(scheduled_start),
    scheduled_end_date = DATE(scheduled_end)
WHERE scheduled_start IS NOT NULL AND scheduled_date IS NULL;

-- Create calendar appointments table for detailed scheduling with times
CREATE TABLE IF NOT EXISTS crm_job_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES crm_jobs(id) ON DELETE CASCADE,
  title TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  google_calendar_id UUID REFERENCES google_calendars(id),
  google_calendar_event_id TEXT,
  assigned_team_id UUID REFERENCES crm_teams(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on appointments table
ALTER TABLE crm_job_appointments ENABLE ROW LEVEL SECURITY;

-- RLS policy: authenticated users can manage job appointments
CREATE POLICY "Authenticated users can manage job appointments" 
  ON crm_job_appointments FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger for appointments
CREATE TRIGGER update_job_appointments_updated_at
  BEFORE UPDATE ON crm_job_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for faster job lookups
CREATE INDEX IF NOT EXISTS idx_job_appointments_job_id ON crm_job_appointments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_appointments_start ON crm_job_appointments(start_datetime);