-- integration_configs.integration_name is UNIQUE globally, which means only
-- one 'workedge' row (and one 'ottopay' row) could ever exist across ALL
-- tenants. That's a hard blocker for multi-tenancy: a second tenant could
-- never configure their own WorkEdge/Ottopay connection. Replace the
-- single-column unique constraint with a composite one scoped per tenant,
-- and store each tenant's API key alongside api_url in `config` (JSONB)
-- since env-var secrets can't vary per tenant.
ALTER TABLE public.integration_configs
  DROP CONSTRAINT IF EXISTS integration_configs_integration_name_key;

ALTER TABLE public.integration_configs
  ADD CONSTRAINT integration_configs_tenant_integration_key
  UNIQUE (tenant_id, integration_name);
