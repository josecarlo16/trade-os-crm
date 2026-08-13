-- role_permissions has a global UNIQUE(role, permission_key) constraint left
-- over from before multi-tenancy, meaning only ONE tenant could ever have a
-- permission row per role — every other tenant's nav sidebar renders empty
-- forever, with no way to configure it. RLS also has no tenant filter, so
-- once a second tenant's rows exist, every tenant's permission lookup
-- returns the UNION of all tenants' enabled permissions.
ALTER TABLE public.role_permissions
  DROP CONSTRAINT IF EXISTS role_permissions_role_permission_key_key;

ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_tenant_role_permission_key
  UNIQUE (tenant_id, role, permission_key);

DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.role_permissions;

CREATE POLICY "Users can read their own tenant's permissions"
  ON public.role_permissions FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());
