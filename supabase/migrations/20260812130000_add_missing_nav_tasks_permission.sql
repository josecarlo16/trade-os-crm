-- 'nav.tasks' was never added to role_permissions in the original seed
-- migration, even though the Tasks page/route/nav-config entry all exist in
-- the codebase and the live Truficient site shows it (likely enabled there
-- later via the permissions UI, which never got captured back into a
-- migration). Add it for the 'admin' role across all existing tenants so
-- the Tasks nav item actually renders.
INSERT INTO public.role_permissions (role, permission_key, enabled, tenant_id)
SELECT 'admin', 'nav.tasks', true, id
FROM public.tenants
ON CONFLICT (tenant_id, role, permission_key) DO NOTHING;
