-- The original CRM data migration re-ran its lookup/seed-table insert step a
-- second time (all duplicate rows share one of two 2026-08-04 batch
-- timestamps, distinct from the organic Jan-Jun 2026 originals) without
-- deduplicating first. This silently duplicated every row in several
-- lookup tables. Confirmed by a full-database integrity audit after a user
-- report of a job's "Workflow Progress" stepper showing repeated stage
-- pills (crm_job_stages already fixed in a prior migration).
--
-- crm_job_types was the most severe: real crm_jobs rows ended up split
-- across the original and duplicate id for the same job type (e.g.
-- "Installation" had 98 jobs on one row and 8 on its duplicate), which
-- would have broken job-type filtering/grouping throughout the admin UI.
--
-- For each duplicate group we keep the earliest (original) row as
-- canonical, remap every foreign-key reference to it, then delete the
-- duplicate. estimate_templates is the exception: we keep whichever copy
-- actually has estimate_template_items (the duplicate copies were empty
-- shells with 0 items).

DO $dedupe$
DECLARE
  grp RECORD;
  canonical_id UUID;
  dup_id UUID;
BEGIN
  -- crm_job_types (by name) -> crm_job_stages.job_type_id, crm_jobs.job_type_id, google_calendars.linked_job_type_id
  FOR grp IN
    SELECT name, array_agg(id ORDER BY created_at, id) AS ids
    FROM public.crm_job_types GROUP BY name HAVING count(*) > 1
  LOOP
    canonical_id := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];
      UPDATE public.crm_job_stages SET job_type_id = canonical_id WHERE job_type_id = dup_id;
      UPDATE public.crm_jobs SET job_type_id = canonical_id WHERE job_type_id = dup_id;
      UPDATE public.google_calendars SET linked_job_type_id = canonical_id WHERE linked_job_type_id = dup_id;
      DELETE FROM public.crm_job_types WHERE id = dup_id;
    END LOOP;
  END LOOP;

  -- crm_contract_tiers (by name, segment) -> crm_maintenance_contracts.tier_id
  FOR grp IN
    SELECT name, segment, array_agg(id ORDER BY created_at, id) AS ids
    FROM public.crm_contract_tiers GROUP BY name, segment HAVING count(*) > 1
  LOOP
    canonical_id := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];
      UPDATE public.crm_maintenance_contracts SET tier_id = canonical_id WHERE tier_id = dup_id;
      DELETE FROM public.crm_contract_tiers WHERE id = dup_id;
    END LOOP;
  END LOOP;

  -- ductless_unit_types (by name) -> ductless_estimate_submissions.unit_type_id, ductless_unit_size_pricing.unit_type_id
  FOR grp IN
    SELECT name, array_agg(id ORDER BY created_at, id) AS ids
    FROM public.ductless_unit_types GROUP BY name HAVING count(*) > 1
  LOOP
    canonical_id := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];
      UPDATE public.ductless_estimate_submissions SET unit_type_id = canonical_id WHERE unit_type_id = dup_id;
      -- the duplicate unit type already has its own size-pricing rows for the
      -- same sizes as the canonical one; drop the redundant copies before
      -- remapping the rest, or the unique (unit_type_id, size_tons) index trips.
      DELETE FROM public.ductless_unit_size_pricing d
        USING public.ductless_unit_size_pricing c
        WHERE d.unit_type_id = dup_id AND c.unit_type_id = canonical_id AND d.size_tons = c.size_tons;
      UPDATE public.ductless_unit_size_pricing SET unit_type_id = canonical_id WHERE unit_type_id = dup_id;
      DELETE FROM public.ductless_unit_types WHERE id = dup_id;
    END LOOP;
  END LOOP;

  -- ductless_addons (by name) -> no FK constraint references this table; direct delete
  FOR grp IN
    SELECT name, array_agg(id ORDER BY created_at, id) AS ids
    FROM public.ductless_addons GROUP BY name HAVING count(*) > 1
  LOOP
    canonical_id := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];
      DELETE FROM public.ductless_addons WHERE id = dup_id;
    END LOOP;
  END LOOP;

  -- labor_rates (by name) -> estimate_line_items.labor_rate_id, estimate_template_items.labor_rate_id
  FOR grp IN
    SELECT name, array_agg(id ORDER BY created_at, id) AS ids
    FROM public.labor_rates GROUP BY name HAVING count(*) > 1
  LOOP
    canonical_id := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];
      UPDATE public.estimate_line_items SET labor_rate_id = canonical_id WHERE labor_rate_id = dup_id;
      UPDATE public.estimate_template_items SET labor_rate_id = canonical_id WHERE labor_rate_id = dup_id;
      DELETE FROM public.labor_rates WHERE id = dup_id;
    END LOOP;
  END LOOP;

  -- materials_catalog (by name) -> estimate_line_items.material_id, estimate_template_items.material_id,
  -- material_request_items.material_id, material_suppliers.material_id
  FOR grp IN
    SELECT name, array_agg(id ORDER BY created_at, id) AS ids
    FROM public.materials_catalog GROUP BY name HAVING count(*) > 1
  LOOP
    canonical_id := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];
      UPDATE public.estimate_line_items SET material_id = canonical_id WHERE material_id = dup_id;
      UPDATE public.estimate_template_items SET material_id = canonical_id WHERE material_id = dup_id;
      UPDATE public.material_request_items SET material_id = canonical_id WHERE material_id = dup_id;
      UPDATE public.material_suppliers SET material_id = canonical_id WHERE material_id = dup_id;
      DELETE FROM public.materials_catalog WHERE id = dup_id;
    END LOOP;
  END LOOP;

  -- estimate_templates (by name) -> estimate_template_items.template_id; keep the copy WITH items as canonical
  FOR grp IN
    SELECT name, array_agg(id ORDER BY (SELECT count(*) FROM public.estimate_template_items eti WHERE eti.template_id = t.id) DESC, created_at) AS ids
    FROM public.estimate_templates t GROUP BY name HAVING count(*) > 1
  LOOP
    canonical_id := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];
      UPDATE public.estimate_template_items SET template_id = canonical_id WHERE template_id = dup_id;
      DELETE FROM public.estimate_templates WHERE id = dup_id;
    END LOOP;
  END LOOP;

  -- crm_email_templates (by name) -> crm_email_log.template_id
  FOR grp IN
    SELECT name, array_agg(id ORDER BY created_at, id) AS ids
    FROM public.crm_email_templates GROUP BY name HAVING count(*) > 1
  LOOP
    canonical_id := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];
      UPDATE public.crm_email_log SET template_id = canonical_id WHERE template_id = dup_id;
      DELETE FROM public.crm_email_templates WHERE id = dup_id;
    END LOOP;
  END LOOP;

  -- Merging crm_job_types above collapses two job types' stage sets onto one
  -- job_type_id, which re-introduces duplicate stage names within that type
  -- (each side already had its own "Cancelled", "Complete", etc.). Run the
  -- same stage dedup from the prior migration again, now scoped across the
  -- post-merge job_type_id values, so this is safe/idempotent either way.
  FOR grp IN
    SELECT job_type_id, name, array_agg(id ORDER BY sort_order, id) AS ids
    FROM public.crm_job_stages
    GROUP BY job_type_id, name
    HAVING count(*) > 1
  LOOP
    canonical_id := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];
      UPDATE public.crm_jobs SET current_stage_id = canonical_id WHERE current_stage_id = dup_id;
      UPDATE public.crm_job_stage_history SET from_stage_id = canonical_id WHERE from_stage_id = dup_id;
      UPDATE public.crm_job_stage_history SET to_stage_id = canonical_id WHERE to_stage_id = dup_id;
      DELETE FROM public.crm_job_stages WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $dedupe$;
