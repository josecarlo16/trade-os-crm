-- Seed the first Trade-OS CRM login: assigns the manually-created auth user
-- (fohagin913@bejum.com, created via the Supabase dashboard for smoke-testing)
-- the 'admin' role on the default 'Truficient' tenant created by the
-- multi-tenancy migration.
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT
  '0dc3e5de-789d-473a-a621-16716d1a3eeb',
  'admin',
  id
FROM public.tenants
WHERE slug = 'truficient'
ON CONFLICT (user_id, role) DO NOTHING;
