INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  ('admin',      'nav.maintenance-contracts', true),
  ('super_admin','nav.maintenance-contracts', true),
  ('manager',    'nav.maintenance-contracts', true),
  ('technician', 'nav.maintenance-contracts', false),
  ('lead_tech',  'nav.maintenance-contracts', false),
  ('installer',  'nav.maintenance-contracts', false),
  ('helper',     'nav.maintenance-contracts', false)
ON CONFLICT (role, permission_key) DO NOTHING;