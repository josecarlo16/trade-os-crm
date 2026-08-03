-- Fix RLS for ducted_estimate_submissions: restrict SELECT and UPDATE to admin/manager only

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view ducted submissions" ON ducted_estimate_submissions;
DROP POLICY IF EXISTS "Authenticated users can update ducted submissions" ON ducted_estimate_submissions;

-- Create secure policies for admin/manager access only
CREATE POLICY "Admins and managers can view ducted submissions"
  ON ducted_estimate_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update ducted submissions"
  ON ducted_estimate_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );