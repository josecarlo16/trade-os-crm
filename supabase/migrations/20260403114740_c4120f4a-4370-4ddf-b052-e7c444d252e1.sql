
-- 1. Drop bootstrap first admin policy (race condition risk)
DROP POLICY IF EXISTS "Bootstrap first admin" ON public.user_roles;

-- 2. Fix estimate_versions: remove public SELECT, restrict to admin/manager
DROP POLICY IF EXISTS "Anyone can view estimate versions" ON public.estimate_versions;
DROP POLICY IF EXISTS "Public can view estimate versions" ON public.estimate_versions;
DROP POLICY IF EXISTS "Allow public read access" ON public.estimate_versions;

CREATE POLICY "Admins and managers can view estimate versions"
  ON public.estimate_versions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- 3. Fix crm_job_assignments: restrict to authenticated admin/manager
DROP POLICY IF EXISTS "Anyone can view job assignments" ON public.crm_job_assignments;
DROP POLICY IF EXISTS "Authenticated users can view job assignments" ON public.crm_job_assignments;
DROP POLICY IF EXISTS "Allow public read access" ON public.crm_job_assignments;

CREATE POLICY "Admins and managers can view job assignments"
  ON public.crm_job_assignments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- 4. Fix crm_team_assignments: restrict to authenticated admin/manager
DROP POLICY IF EXISTS "Anyone can view team assignments" ON public.crm_team_assignments;
DROP POLICY IF EXISTS "Authenticated users can view team assignments" ON public.crm_team_assignments;
DROP POLICY IF EXISTS "Allow public read access" ON public.crm_team_assignments;

CREATE POLICY "Admins and managers can view team assignments"
  ON public.crm_team_assignments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- 5. Fix crm_job_stage_history: restrict to authenticated admin/manager
DROP POLICY IF EXISTS "Anyone can view job stage history" ON public.crm_job_stage_history;
DROP POLICY IF EXISTS "Authenticated users can view job stage history" ON public.crm_job_stage_history;
DROP POLICY IF EXISTS "Allow public read access" ON public.crm_job_stage_history;

CREATE POLICY "Admins and managers can view job stage history"
  ON public.crm_job_stage_history FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- 6. Fix crm_customer_notes: restrict write ops to admin/manager
DROP POLICY IF EXISTS "Authenticated users can manage customer notes" ON public.crm_customer_notes;

CREATE POLICY "Admins and managers can manage customer notes"
  ON public.crm_customer_notes FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- 7. Fix blog_images storage: restrict to admin roles
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete blog images" ON storage.objects;

CREATE POLICY "Admins can upload blog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog_images' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins can update blog images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'blog_images' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins can delete blog images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog_images' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- 8. Fix workedge-media storage: restrict to admin roles
DROP POLICY IF EXISTS "Authenticated users can upload workedge media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update workedge media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete workedge media" ON storage.objects;

CREATE POLICY "Admins can upload workedge media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'workedge-media' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins can update workedge media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'workedge-media' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins can delete workedge media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'workedge-media' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));
