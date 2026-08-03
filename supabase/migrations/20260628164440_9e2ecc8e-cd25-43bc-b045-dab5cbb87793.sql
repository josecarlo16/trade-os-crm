
DROP POLICY IF EXISTS "Admins manage job lists" ON public.crm_job_lists;
DROP POLICY IF EXISTS "Admins manage job list items" ON public.crm_job_list_items;

CREATE POLICY "Staff manage job lists" ON public.crm_job_lists
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff manage job list items" ON public.crm_job_list_items
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
