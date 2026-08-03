INSERT INTO public.role_permissions (role, permission_key, enabled)
SELECT r::app_role, 'nav.dispatch-map', true
FROM (VALUES ('admin'),('manager'),('lead_tech'),('technician'),('installer'),('helper')) AS t(r)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = true;