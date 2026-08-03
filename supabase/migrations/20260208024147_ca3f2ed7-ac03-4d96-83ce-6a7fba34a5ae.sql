-- Seed default permissions (all disabled) for the new roles
INSERT INTO role_permissions (role, permission_key, enabled)
SELECT r.role::app_role, p.key, false
FROM (VALUES ('technician'), ('lead_tech'), ('installer'), ('helper')) AS r(role)
CROSS JOIN (
  VALUES 
    ('nav.dashboard'), ('nav.abandoned-carts'), ('nav.customers'), ('nav.locations'),
    ('nav.submissions'), ('nav.pipeline'), ('nav.dfw-watchlist'), ('nav.calendar'),
    ('nav.jobs'), ('nav.teams'), ('nav.workedge'), ('nav.job-types'), ('nav.calendars'),
    ('nav.blog'), ('nav.gallery'), ('nav.equipment-library'), ('nav.estimates'),
    ('nav.estimate-templates'), ('nav.system-pricing'), ('nav.customer-equipment'),
    ('nav.ductless-config'), ('nav.materials'), ('nav.labor-rates'), ('nav.admin-costs'),
    ('nav.financing'), ('nav.seo'), ('nav.calculators'), ('nav.landing-pages'),
    ('nav.ghl-tags'), ('nav.ghl-conversations'), ('nav.scanner-analytics'),
    ('nav.button-clicks'), ('nav.analytics'), ('nav.social-media'), ('nav.users'),
    ('nav.permissions'), ('nav.ai-settings'), ('nav.automations'), ('nav.lead-sources'),
    ('nav.campaign-tags'), ('nav.trash-bin'), ('nav.settings')
) AS p(key)
ON CONFLICT (role, permission_key) DO NOTHING;