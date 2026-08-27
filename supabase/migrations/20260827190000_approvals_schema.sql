-- =====================================================================
-- DRAFT FOR REVIEW — Approvals, tied to real job-stage and estimate events.
-- Not numbered for apply yet.
--
-- Client decision 2026-08-27: FLAG ONLY. A pending approval does NOT block
-- the job stage move or the estimate from being sent — it's a logged,
-- visible record alongside normal workflow. No existing mutation code path
-- (Jobs.tsx moveJobMutation, estimate save) needs to change; approval rows
-- are created entirely by a DB trigger, the same pattern this codebase
-- already uses for admin_notifications (see
-- 20260819161500_fix_notification_triggers_missing_tenant_id.sql). That
-- keeps this additive — zero risk of breaking today's stage-move or
-- estimate-send flow.
-- =====================================================================

-- Which events create an approval request, and at what level (matching the
-- L1-L4 autonomy tiers from the AI/agent design note). Row-based so this is
-- tunable from the database without another migration — e.g. raise/lower
-- the estimate dollar threshold, or add/remove which stage names trigger
-- an approval, per tenant.
create table public.approval_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source_type text not null check (source_type in ('job_stage_change', 'estimate_sent')),
  -- job_stage_change: fires when a job's stage NAME matches this (case-insensitive)
  stage_name text,
  -- estimate_sent: fires when grand_total >= this amount
  min_amount numeric(12,2),
  level text not null default 'L4' check (level in ('L1', 'L2', 'L3', 'L4')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.approval_rules enable row level security;

create policy "approval_rules_select_admin"
  on public.approval_rules for select
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create policy "approval_rules_write_admin"
  on public.approval_rules for all
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- Starting defaults — Eric confirmed these can be wrong and tunable, not a
-- final policy decision. Seeded per existing tenant, same pattern as the
-- nav.trade-os permission seed.
insert into public.approval_rules (tenant_id, source_type, stage_name, level)
select id, 'job_stage_change', 'Closed Won', 'L2' from public.tenants;

insert into public.approval_rules (tenant_id, source_type, min_amount, level)
select id, 'estimate_sent', 5000, 'L4' from public.tenants;

-- The approval record itself.
create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  rule_id uuid references public.approval_rules(id) on delete set null,
  title text not null,
  description text,
  level text not null check (level in ('L1', 'L2', 'L3', 'L4')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'held')),
  source_type text not null,
  source_id uuid not null, -- crm_jobs.id or estimates.id, not FK'd (two possible tables)
  related_job_id uuid references public.crm_jobs(id) on delete set null,
  requested_by uuid references auth.users(id),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index approval_requests_tenant_status_idx on public.approval_requests (tenant_id, status);

alter table public.approval_requests enable row level security;

-- Matches the confirmed ROLE_BLOCKS decision: approvals visible to
-- owner_admin only (admin/super_admin), not Back-Office Manager or Tech.
create policy "approval_requests_select_admin"
  on public.approval_requests for select
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create policy "approval_requests_update_admin"
  on public.approval_requests for update
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- =====================================================================
-- Triggers — flag only, never block. Both are pure INSERTs into
-- approval_requests; neither raises, neither prevents the underlying
-- UPDATE/INSERT on crm_jobs / estimates from succeeding.
-- =====================================================================

create or replace function public.create_approval_for_job_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage_name text;
  v_rule record;
begin
  if OLD.current_stage_id is distinct from NEW.current_stage_id and NEW.current_stage_id is not null then
    select name into v_stage_name from public.crm_job_stages where id = NEW.current_stage_id;

    for v_rule in
      select * from public.approval_rules
      where tenant_id = NEW.tenant_id
        and source_type = 'job_stage_change'
        and enabled = true
        and lower(stage_name) = lower(v_stage_name)
    loop
      insert into public.approval_requests (tenant_id, rule_id, title, description, level, source_type, source_id, related_job_id)
      values (
        NEW.tenant_id, v_rule.id,
        NEW.job_number || ' moved to ' || v_stage_name,
        'Job ' || NEW.job_number || ' entered a stage flagged for approval.',
        v_rule.level, 'job_stage_change', NEW.id, NEW.id
      );
    end loop;
  end if;
  return NEW;
end;
$$;

create trigger trigger_create_approval_for_job_stage
  after update on public.crm_jobs
  for each row execute function public.create_approval_for_job_stage();

create or replace function public.create_approval_for_estimate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule record;
  v_tenant_id uuid;
begin
  -- estimates has no tenant_id column today (flagged in the security
  -- checklist, B-3). Resolve tenant via the estimate's creator instead of
  -- auth.uid() — a trigger fired by an admin editing someone else's
  -- estimate must not misattribute it to the admin's tenant. Once
  -- tenant_id is added to estimates directly (fixing B-3), simplify this
  -- to NEW.tenant_id.
  select tenant_id into v_tenant_id from public.user_roles where user_id = NEW.created_by limit 1;
  if v_tenant_id is null then
    return NEW;
  end if;

  if NEW.status = 'sent' and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
    for v_rule in
      select * from public.approval_rules
      where tenant_id = v_tenant_id
        and source_type = 'estimate_sent'
        and enabled = true
        and NEW.grand_total >= coalesce(min_amount, 0)
    loop
      insert into public.approval_requests (tenant_id, rule_id, title, description, level, source_type, source_id)
      values (
        v_tenant_id, v_rule.id,
        'Estimate ' || NEW.estimate_number || ' — $' || NEW.grand_total,
        'Estimate for ' || NEW.customer_name || ' sent at $' || NEW.grand_total || ', above the review threshold.',
        v_rule.level, 'estimate_sent', NEW.id
      );
    end loop;
  end if;
  return NEW;
end;
$$;

create trigger trigger_create_approval_for_estimate
  after insert or update on public.estimates
  for each row execute function public.create_approval_for_estimate();

comment on table public.approval_requests is
  'Flag-only approval log. Never blocks the underlying job stage move or estimate send — client decision 2026-08-27. Rows are created by DB triggers, not application code.';
