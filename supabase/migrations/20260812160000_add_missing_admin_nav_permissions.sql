-- 18 more nav permission keys (Companies, Inbox, Email Settings/Templates,
-- the entire Invoicing & Payments section, Suppliers, Timesheets, Role
-- Permissions, Individual Equipment Pricing) were never seeded for the
-- admin role at all — same class of gap as nav.tasks before. All of the
-- underlying pages/routes already exist in the codebase; this was purely a
-- missing-permission-row issue hiding fully-working features.
INSERT INTO public.role_permissions (role, permission_key, enabled, tenant_id)
SELECT 'admin', unnest(ARRAY[
  'nav.companies', 'nav.email-settings', 'nav.email-templates',
  'nav.equipment-pricing', 'nav.inbox', 'nav.invoice-catalog',
  'nav.invoice-clients', 'nav.invoice-expenses', 'nav.invoice-reports',
  'nav.invoice-settings', 'nav.invoice-templates', 'nav.invoices',
  'nav.invoicing', 'nav.otto-estimates', 'nav.payments', 'nav.permissions',
  'nav.suppliers', 'nav.timesheets'
]), true, id
FROM public.tenants
ON CONFLICT (tenant_id, role, permission_key) DO NOTHING;
