-- Rate history for team members (effective-dated raises)
CREATE TABLE public.crm_team_member_rate_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.crm_team_members(id) ON DELETE CASCADE,
  hourly_rate NUMERIC NOT NULL,
  overtime_rate NUMERIC,
  effective_date DATE NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, effective_date)
);

CREATE INDEX idx_rate_history_member_date
  ON public.crm_team_member_rate_history (team_member_id, effective_date DESC);

ALTER TABLE public.crm_team_member_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rate history"
  ON public.crm_team_member_rate_history
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_rate_history_updated_at
  BEFORE UPDATE ON public.crm_team_member_rate_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: get effective rate for a member on a given date
CREATE OR REPLACE FUNCTION public.get_effective_rate(_team_member_id UUID, _on_date DATE)
RETURNS TABLE(hourly_rate NUMERIC, overtime_rate NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT h.hourly_rate, h.overtime_rate
  FROM public.crm_team_member_rate_history h
  WHERE h.team_member_id = _team_member_id
    AND h.effective_date <= _on_date
  ORDER BY h.effective_date DESC
  LIMIT 1
$$;

-- Sync cached rate columns on crm_team_members to the currently-effective entry
CREATE OR REPLACE FUNCTION public.sync_team_member_current_rate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _member_id UUID;
  _hr NUMERIC;
  _ot NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _member_id := OLD.team_member_id;
  ELSE
    _member_id := NEW.team_member_id;
  END IF;

  SELECT hourly_rate, overtime_rate
    INTO _hr, _ot
  FROM public.crm_team_member_rate_history
  WHERE team_member_id = _member_id
    AND effective_date <= CURRENT_DATE
  ORDER BY effective_date DESC
  LIMIT 1;

  UPDATE public.crm_team_members
     SET hourly_rate = _hr,
         overtime_rate = _ot,
         updated_at = now()
   WHERE id = _member_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_member_rate
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_team_member_rate_history
  FOR EACH ROW EXECUTE FUNCTION public.sync_team_member_current_rate();

-- Backfill: seed history with today's effective date from current cached rates
INSERT INTO public.crm_team_member_rate_history (team_member_id, hourly_rate, overtime_rate, effective_date, notes)
SELECT id, COALESCE(hourly_rate, 0), overtime_rate, CURRENT_DATE, 'Backfill from existing rate'
FROM public.crm_team_members
WHERE hourly_rate IS NOT NULL
ON CONFLICT (team_member_id, effective_date) DO NOTHING;