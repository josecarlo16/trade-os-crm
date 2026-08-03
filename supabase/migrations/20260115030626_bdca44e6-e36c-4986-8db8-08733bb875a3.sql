-- Create a function to get user roles with emails (uses security definer to access auth.users)
CREATE OR REPLACE FUNCTION public.get_user_roles_with_email()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  role app_role,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.id,
    ur.user_id,
    au.email,
    ur.role,
    ur.created_at
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  ORDER BY ur.created_at DESC
$$;