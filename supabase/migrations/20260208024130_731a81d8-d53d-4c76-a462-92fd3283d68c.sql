-- Add new role values to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'technician';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'lead_tech';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'installer';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'helper';