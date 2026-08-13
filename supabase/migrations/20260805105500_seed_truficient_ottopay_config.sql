-- Before multi-tenancy, ottopay-proxy read Otto Pay credentials straight
-- from env secrets with no integration_configs row required at all. The
-- tenant-scoped rewrite of ottopay-proxy requires a row to exist (even an
-- empty one) before it will fall back to those env secrets for Truficient
-- specifically — this seeds that row so the existing integration keeps
-- working instead of silently breaking.
INSERT INTO public.integration_configs (tenant_id, integration_name, config, is_active)
SELECT id, 'ottopay', '{}'::jsonb, true
FROM public.tenants
WHERE slug = 'truficient'
ON CONFLICT (tenant_id, integration_name) DO NOTHING;
