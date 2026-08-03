
-- Drop overly permissive blog_posts policies
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON public.blog_posts;

-- Create admin-only write policies using the standardized role pattern
CREATE POLICY "Admins can insert blog posts"
  ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager'));

CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager'));

CREATE POLICY "Admins can delete blog posts"
  ON public.blog_posts FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'manager'));
