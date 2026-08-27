-- New "Trade OS" nav item (src/pages/admin/TradeOSDashboard.tsx) needs a
-- role_permissions row per role or it's invisible to everyone but
-- super_admin, per the existing nav.* enforcement pattern (see
-- 20260812130000_add_missing_nav_tasks_permission.sql for precedent).
--
-- The link itself is granted to every role — the page controls what's
-- actually shown per role internally (locked/placeholder module cards),
-- same as the rest of the app's real data access, which stays governed by
-- RLS regardless of this table. This nav key is presentational only.
INSERT INTO public.role_permissions (role, permission_key, enabled, tenant_id)
SELECT r.role, 'nav.trade-os', true, t.id
FROM public.tenants t
CROSS JOIN (
  SELECT unnest(ARRAY['admin', 'manager', 'technician', 'lead_tech', 'installer', 'helper']::public.app_role[]) AS role
) r
ON CONFLICT (tenant_id, role, permission_key) DO NOTHING;
