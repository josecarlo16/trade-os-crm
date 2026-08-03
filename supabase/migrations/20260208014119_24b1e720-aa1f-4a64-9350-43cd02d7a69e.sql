-- =====================================================
-- Fix RLS policies for submission tables to include super_admin
-- =====================================================

-- 1. Fix contact_submissions
DROP POLICY IF EXISTS "Admins and managers can view submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admins and managers can update submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions" ON contact_submissions;

CREATE POLICY "Admins and managers can view submissions" 
  ON contact_submissions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update submissions" 
  ON contact_submissions FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete submissions" 
  ON contact_submissions FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- 2. Fix ducted_estimate_submissions
DROP POLICY IF EXISTS "Admins and managers can view ducted submissions" ON ducted_estimate_submissions;
DROP POLICY IF EXISTS "Admins and managers can update ducted submissions" ON ducted_estimate_submissions;
DROP POLICY IF EXISTS "Admins can delete ducted submissions" ON ducted_estimate_submissions;

CREATE POLICY "Admins and managers can view ducted submissions" 
  ON ducted_estimate_submissions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update ducted submissions" 
  ON ducted_estimate_submissions FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete ducted submissions" 
  ON ducted_estimate_submissions FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- 3. Fix ductless_estimate_submissions
DROP POLICY IF EXISTS "Admins and managers can view ductless submissions" ON ductless_estimate_submissions;
DROP POLICY IF EXISTS "Admins and managers can update ductless submissions" ON ductless_estimate_submissions;
DROP POLICY IF EXISTS "Admins can delete ductless submissions" ON ductless_estimate_submissions;

CREATE POLICY "Admins and managers can view ductless submissions" 
  ON ductless_estimate_submissions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update ductless submissions" 
  ON ductless_estimate_submissions FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete ductless submissions" 
  ON ductless_estimate_submissions FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- 4. Fix landing_page_submissions
DROP POLICY IF EXISTS "Admins can view landing page submissions" ON landing_page_submissions;
DROP POLICY IF EXISTS "Admins can update landing page submissions" ON landing_page_submissions;
DROP POLICY IF EXISTS "Admins can delete landing page submissions" ON landing_page_submissions;

CREATE POLICY "Admins can view landing page submissions" 
  ON landing_page_submissions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update landing page submissions" 
  ON landing_page_submissions FOR UPDATE 
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

CREATE POLICY "Admins can delete landing page submissions" 
  ON landing_page_submissions FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );