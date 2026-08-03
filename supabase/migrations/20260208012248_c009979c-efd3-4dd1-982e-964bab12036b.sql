-- Fix RLS policies for WorkEdge integration tables to include super_admin role

-- 1. Fix integration_configs table
DROP POLICY IF EXISTS "Admins can manage integration configs" ON public.integration_configs;

CREATE POLICY "Admins can manage integration configs"
ON public.integration_configs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- 2. Fix workedge_sync_log table
DROP POLICY IF EXISTS "Admins can manage sync logs" ON public.workedge_sync_log;

CREATE POLICY "Admins can manage sync logs"
ON public.workedge_sync_log FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- 3. Fix workedge_project_media table
DROP POLICY IF EXISTS "Admins can manage project media" ON public.workedge_project_media;

CREATE POLICY "Admins can manage project media"
ON public.workedge_project_media FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  )
);