INSERT INTO public.role_permissions (role, permission_key, enabled)
VALUES
  ('admin'::app_role, 'nav.material-lists', true),
  ('manager'::app_role, 'nav.material-lists', true),
  ('lead_tech'::app_role, 'nav.material-lists', true),
  ('technician'::app_role, 'nav.material-lists', true),
  ('installer'::app_role, 'nav.material-lists', true),
  ('helper'::app_role, 'nav.material-lists', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;