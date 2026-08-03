INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  ('admin','nav.knowledge-base',true),
  ('super_admin','nav.knowledge-base',true),
  ('manager','nav.knowledge-base',true),
  ('technician','nav.knowledge-base',true),
  ('lead_tech','nav.knowledge-base',true),
  ('installer','nav.knowledge-base',true),
  ('helper','nav.knowledge-base',true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = true;