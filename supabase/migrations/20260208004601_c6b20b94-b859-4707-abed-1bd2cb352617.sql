-- Fix RLS policies to include super_admin role across all CRM tables

-- =====================================================
-- crm_pipeline_entries
-- =====================================================
DROP POLICY IF EXISTS "Admins and managers can insert pipeline entries" ON crm_pipeline_entries;
DROP POLICY IF EXISTS "Admins and managers can update pipeline entries" ON crm_pipeline_entries;
DROP POLICY IF EXISTS "Admins can delete pipeline entries" ON crm_pipeline_entries;

CREATE POLICY "Admins and managers can insert pipeline entries" 
  ON crm_pipeline_entries FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update pipeline entries" 
  ON crm_pipeline_entries FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete pipeline entries" 
  ON crm_pipeline_entries FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- crm_customers
-- =====================================================
DROP POLICY IF EXISTS "Admins and managers can insert customers" ON crm_customers;
DROP POLICY IF EXISTS "Admins and managers can update customers" ON crm_customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON crm_customers;

CREATE POLICY "Admins and managers can insert customers" 
  ON crm_customers FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update customers" 
  ON crm_customers FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete customers" 
  ON crm_customers FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- crm_interactions
-- =====================================================
DROP POLICY IF EXISTS "Admins and managers can insert interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Admins and managers can update interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Admins can delete interactions" ON crm_interactions;

CREATE POLICY "Admins and managers can insert interactions" 
  ON crm_interactions FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update interactions" 
  ON crm_interactions FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete interactions" 
  ON crm_interactions FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- crm_locations
-- =====================================================
DROP POLICY IF EXISTS "Admins and managers can insert locations" ON crm_locations;
DROP POLICY IF EXISTS "Admins and managers can update locations" ON crm_locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON crm_locations;

CREATE POLICY "Admins and managers can insert locations" 
  ON crm_locations FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update locations" 
  ON crm_locations FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete locations" 
  ON crm_locations FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- crm_jobs
-- =====================================================
DROP POLICY IF EXISTS "Admins and managers can insert jobs" ON crm_jobs;
DROP POLICY IF EXISTS "Admins and managers can update jobs" ON crm_jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON crm_jobs;

CREATE POLICY "Admins and managers can insert jobs" 
  ON crm_jobs FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update jobs" 
  ON crm_jobs FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete jobs" 
  ON crm_jobs FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );