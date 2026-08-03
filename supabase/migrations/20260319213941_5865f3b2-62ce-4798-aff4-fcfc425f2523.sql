
-- Time entries table for crew timesheets
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.crm_team_members(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  manual_start TIME,
  manual_end TIME,
  break_minutes INTEGER DEFAULT 0,
  total_hours NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  hourly_rate NUMERIC(10,2),
  overtime_rate NUMERIC(10,2),
  job_id UUID REFERENCES public.crm_jobs(id) ON DELETE SET NULL,
  notes TEXT,
  entry_type TEXT NOT NULL DEFAULT 'manual' CHECK (entry_type IN ('clock', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_time_entries_member_date ON public.time_entries(team_member_id, entry_date);
CREATE INDEX idx_time_entries_date ON public.time_entries(entry_date);
CREATE INDEX idx_time_entries_job ON public.time_entries(job_id);

-- Auto-update updated_at
CREATE TRIGGER set_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies: admin/manager/super_admin full access
CREATE POLICY "Admins can manage time entries"
  ON public.time_entries
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );
