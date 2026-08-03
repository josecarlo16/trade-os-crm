-- Fix RLS policies for ductless_estimate_submissions to protect customer PII
-- Currently the "Admins can manage submissions" ALL policy may not be restrictive enough

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage submissions" ON ductless_estimate_submissions;
DROP POLICY IF EXISTS "Public can submit ductless estimates (validated)" ON ductless_estimate_submissions;

-- Create separate, explicit policies for each operation

-- 1. Public can only INSERT (submit new estimates) with validation
CREATE POLICY "Public can submit ductless estimates"
  ON ductless_estimate_submissions FOR INSERT
  WITH CHECK (
    ((length(customer_name) >= 1) AND (length(customer_name) <= 120)) 
    AND (customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'::text) 
    AND ((customer_phone IS NULL) OR ((length(customer_phone) >= 7) AND (length(customer_phone) <= 30))) 
    AND ((zone_count >= 1) AND (zone_count <= 12)) 
    AND (subtotal >= (0)::numeric) 
    AND (tax_amount >= (0)::numeric) 
    AND (rebates >= (0)::numeric) 
    AND (final_total >= (0)::numeric)
  );

-- 2. Only admins and managers can view submissions (protects customer PII)
CREATE POLICY "Admins and managers can view ductless submissions"
  ON ductless_estimate_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin'::app_role, 'manager'::app_role)
    )
  );

-- 3. Only admins and managers can update submissions
CREATE POLICY "Admins and managers can update ductless submissions"
  ON ductless_estimate_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin'::app_role, 'manager'::app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin'::app_role, 'manager'::app_role)
    )
  );

-- 4. Only admins can delete submissions
CREATE POLICY "Admins can delete ductless submissions"
  ON ductless_estimate_submissions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));