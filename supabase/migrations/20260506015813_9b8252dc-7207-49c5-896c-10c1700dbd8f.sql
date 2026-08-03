
-- page_seo: replace permissive delete with super_admin only
DROP POLICY IF EXISTS "Authenticated users can delete page SEO" ON public.page_seo;
CREATE POLICY "Only super admins can delete page SEO"
  ON public.page_seo FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- seo_location_pages: split ALL policy so DELETE is super_admin only
DROP POLICY IF EXISTS "Admins and managers can manage location pages" ON public.seo_location_pages;
CREATE POLICY "Admins and managers can insert location pages"
  ON public.seo_location_pages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Admins and managers can update location pages"
  ON public.seo_location_pages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Only super admins can delete location pages"
  ON public.seo_location_pages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- equipment_pages: split ALL policy so DELETE is super_admin only
DROP POLICY IF EXISTS "Admins can manage equipment pages" ON public.equipment_pages;
CREATE POLICY "Admins can insert equipment pages (auth)"
  ON public.equipment_pages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update equipment pages (manage)"
  ON public.equipment_pages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only super admins can delete equipment pages"
  ON public.equipment_pages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- blog_posts: tighten delete to super_admin only
DROP POLICY IF EXISTS "Admins can delete blog posts" ON public.blog_posts;
CREATE POLICY "Only super admins can delete blog posts"
  ON public.blog_posts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- blog_categories: restrict delete to super_admin only
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.blog_categories;
CREATE POLICY "Only super admins can delete blog categories"
  ON public.blog_categories FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));
