
-- RPC function for counting new submissions across all tables
CREATE OR REPLACE FUNCTION get_new_submission_counts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  contact_count INT;
  ducted_count INT;
  ductless_count INT;
  scanner_count INT;
  landing_count INT;
  total_count INT;
  last_24h_count INT;
BEGIN
  SELECT COUNT(*) INTO contact_count
  FROM contact_submissions
  WHERE created_at >= NOW() - INTERVAL '48 hours'
  AND (status IS NULL OR status = 'new');

  SELECT COUNT(*) INTO ducted_count
  FROM ducted_estimate_submissions
  WHERE created_at >= NOW() - INTERVAL '48 hours'
  AND (status IS NULL OR status = 'new');

  SELECT COUNT(*) INTO ductless_count
  FROM ductless_estimate_submissions
  WHERE created_at >= NOW() - INTERVAL '48 hours'
  AND (status IS NULL OR status = 'new');

  SELECT COUNT(*) INTO scanner_count
  FROM equipment_scans
  WHERE created_at >= NOW() - INTERVAL '48 hours'
  AND email IS NOT NULL
  AND (status IS NULL OR status = 'new');

  SELECT COUNT(*) INTO landing_count
  FROM landing_page_submissions
  WHERE created_at >= NOW() - INTERVAL '48 hours'
  AND (status IS NULL OR status = 'new');

  total_count := contact_count + ducted_count + ductless_count + scanner_count + landing_count;

  SELECT COUNT(*) INTO last_24h_count FROM (
    SELECT id FROM contact_submissions WHERE created_at >= NOW() - INTERVAL '24 hours' AND (status IS NULL OR status = 'new')
    UNION ALL
    SELECT id FROM ducted_estimate_submissions WHERE created_at >= NOW() - INTERVAL '24 hours' AND (status IS NULL OR status = 'new')
    UNION ALL
    SELECT id FROM ductless_estimate_submissions WHERE created_at >= NOW() - INTERVAL '24 hours' AND (status IS NULL OR status = 'new')
    UNION ALL
    SELECT id FROM equipment_scans WHERE created_at >= NOW() - INTERVAL '24 hours' AND email IS NOT NULL AND (status IS NULL OR status = 'new')
    UNION ALL
    SELECT id FROM landing_page_submissions WHERE created_at >= NOW() - INTERVAL '24 hours' AND (status IS NULL OR status = 'new')
  ) combined;

  result := json_build_object(
    'total', total_count,
    'new_last_24h', last_24h_count,
    'breakdown', json_build_object(
      'contact', contact_count,
      'ducted', ducted_count,
      'ductless', ductless_count,
      'scanner', scanner_count,
      'landing_page', landing_count
    )
  );

  RETURN result;
END;
$$;

-- RBAC table for assistant permissions
CREATE TABLE IF NOT EXISTS assistant_role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE,
  can_access_assistant BOOLEAN NOT NULL DEFAULT false,
  can_use_write_tools BOOLEAN NOT NULL DEFAULT false,
  can_use_calendar_tools BOOLEAN NOT NULL DEFAULT false,
  can_use_voice_input BOOLEAN NOT NULL DEFAULT false,
  can_view_briefing BOOLEAN NOT NULL DEFAULT false,
  can_view_financials BOOLEAN NOT NULL DEFAULT false,
  max_messages_per_hour INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default permissions
INSERT INTO assistant_role_permissions (role_name, can_access_assistant, can_use_write_tools, can_use_calendar_tools, can_use_voice_input, can_view_briefing, can_view_financials, max_messages_per_hour)
VALUES
  ('super_admin', true, true, true, true, true, true, 100),
  ('admin', true, true, true, true, true, true, 60),
  ('manager', true, true, true, true, true, false, 40),
  ('helper', true, false, false, true, false, false, 20),
  ('viewer', false, false, false, false, false, false, 0)
ON CONFLICT (role_name) DO NOTHING;

-- RLS
ALTER TABLE assistant_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assistant permissions"
  ON assistant_role_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can read permissions"
  ON assistant_role_permissions
  FOR SELECT
  USING (true);

-- Updated at trigger
CREATE TRIGGER update_assistant_role_permissions_updated_at
  BEFORE UPDATE ON assistant_role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
