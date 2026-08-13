-- Cross-tenant isolation test fixture: a second tenant + admin user
-- (tenant-b-test@example.com, created via the Supabase Admin API) used to
-- verify RLS actually blocks cross-tenant data access before trusting the
-- multi-tenancy layer with real customers. Safe to delete once the test is done.
INSERT INTO public.tenants (name, slug)
VALUES ('Tenant B Test', 'tenant-b-test')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT
  '90cf9a44-d861-49e1-b8ca-38870067575b',
  'admin',
  id
FROM public.tenants
WHERE slug = 'tenant-b-test'
ON CONFLICT (user_id, role) DO NOTHING;
