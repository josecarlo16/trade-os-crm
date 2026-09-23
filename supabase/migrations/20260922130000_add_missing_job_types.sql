-- The Lovable source has 4 job types this tenant's seed data never included
-- (commercial-inspection, commercial-service-call, residential-installation,
-- residential-maintenance) — needed so lovable-sync can resolve every
-- crm_jobs.job_type_id instead of skipping ~40% of jobs. Same shape as the
-- original seed in 20260207041713_...sql (default stage set per job type).

DO $$
DECLARE
  v_tenant_id UUID := 'cb75a3f3-f310-4587-a4cc-098f50aef59c';
  v_job_type_id UUID;
BEGIN
  -- commercial-inspection
  INSERT INTO public.crm_job_types (tenant_id, name, slug, category, sort_order, is_active)
  VALUES (v_tenant_id, 'Inspection', 'commercial-inspection', 'commercial', 60, true)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_job_type_id;

  IF v_job_type_id IS NOT NULL THEN
    INSERT INTO public.crm_job_stages (tenant_id, job_type_id, name, stage_type, sort_order) VALUES
      (v_tenant_id, v_job_type_id, 'Scheduled', 'initial', 1),
      (v_tenant_id, v_job_type_id, 'En Route', 'in_progress', 2),
      (v_tenant_id, v_job_type_id, 'On Site', 'in_progress', 3),
      (v_tenant_id, v_job_type_id, 'Complete', 'completed', 4),
      (v_tenant_id, v_job_type_id, 'Cancelled', 'cancelled', 5);
  END IF;

  -- commercial-service-call
  v_job_type_id := NULL;
  INSERT INTO public.crm_job_types (tenant_id, name, slug, category, sort_order, is_active)
  VALUES (v_tenant_id, 'Service Call', 'commercial-service-call', 'commercial', 61, true)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_job_type_id;

  IF v_job_type_id IS NOT NULL THEN
    INSERT INTO public.crm_job_stages (tenant_id, job_type_id, name, stage_type, sort_order) VALUES
      (v_tenant_id, v_job_type_id, 'Scheduled', 'initial', 1),
      (v_tenant_id, v_job_type_id, 'En Route', 'in_progress', 2),
      (v_tenant_id, v_job_type_id, 'On Site', 'in_progress', 3),
      (v_tenant_id, v_job_type_id, 'Complete', 'completed', 4),
      (v_tenant_id, v_job_type_id, 'Cancelled', 'cancelled', 5);
  END IF;

  -- residential-installation
  v_job_type_id := NULL;
  INSERT INTO public.crm_job_types (tenant_id, name, slug, category, sort_order, is_active)
  VALUES (v_tenant_id, 'Installation', 'residential-installation', 'residential', 62, true)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_job_type_id;

  IF v_job_type_id IS NOT NULL THEN
    INSERT INTO public.crm_job_stages (tenant_id, job_type_id, name, stage_type, sort_order) VALUES
      (v_tenant_id, v_job_type_id, 'Scheduled', 'initial', 1),
      (v_tenant_id, v_job_type_id, 'En Route', 'in_progress', 2),
      (v_tenant_id, v_job_type_id, 'On Site', 'in_progress', 3),
      (v_tenant_id, v_job_type_id, 'Complete', 'completed', 4),
      (v_tenant_id, v_job_type_id, 'Cancelled', 'cancelled', 5);
  END IF;

  -- residential-maintenance
  v_job_type_id := NULL;
  INSERT INTO public.crm_job_types (tenant_id, name, slug, category, sort_order, is_active)
  VALUES (v_tenant_id, 'Maintenance', 'residential-maintenance', 'residential', 63, true)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_job_type_id;

  IF v_job_type_id IS NOT NULL THEN
    INSERT INTO public.crm_job_stages (tenant_id, job_type_id, name, stage_type, sort_order) VALUES
      (v_tenant_id, v_job_type_id, 'Scheduled', 'initial', 1),
      (v_tenant_id, v_job_type_id, 'En Route', 'in_progress', 2),
      (v_tenant_id, v_job_type_id, 'On Site', 'in_progress', 3),
      (v_tenant_id, v_job_type_id, 'Complete', 'completed', 4),
      (v_tenant_id, v_job_type_id, 'Cancelled', 'cancelled', 5);
  END IF;
END $$;
