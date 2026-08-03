-- Fix RLS infinite recursion on user_roles table
-- The previous migration broke access by having user_roles policies query user_roles directly

-- Drop the broken policies
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;

-- 1. Users can always read their own role (no recursion - simple auth.uid() check)
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- 2. Admins can view all roles using SECURITY DEFINER function (bypasses RLS)
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin')
  );

-- 3. Admins can insert roles using SECURITY DEFINER function
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin')
  );

-- 4. Admins can update roles using SECURITY DEFINER function
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin')
  );

-- 5. Admins can delete roles using SECURITY DEFINER function
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin')
  );