-- =====================================================================
-- DRAFT FOR REVIEW — Migration 3 of 3 (taxonomy -> messaging -> this)
-- Not numbered for apply yet: depends on the permission-taxonomy migration
-- (Migration 1) landing first. The two tables in "ASSUMED INTERFACE" below
-- are a stub of what Migration 1 is expected to produce, written only so
-- this file is self-contained for review. Replace that section with a
-- reference to the real Migration 1 objects once it exists — do not ship
-- both.
-- =====================================================================


-- =====================================================================
-- ASSUMED INTERFACE FROM MIGRATION 1 (permission taxonomy) — STUB ONLY
-- =====================================================================

-- Three role templates, per the 7->3 collapse: super_admin+admin -> owner_admin,
-- manager -> back_office_manager, technician/lead_tech/installer/helper -> tech.
create type public.role_template as enum (
  'owner_admin',
  'back_office_manager',
  'tech'
);

-- Resource taxonomy is Migration 1's real deliverable (the Role x Resource x
-- Action table in the audit, plus the missing scope column). Stubbed here
-- with only the resources this schema needs to reference.
create type public.permission_resource as enum (
  'crm_pipeline',
  'estimates',
  'ar_collections',
  'analytics',
  'social_posting',
  'approvals',
  'workedge_jobs',
  'messages',
  'job_documentation',
  'material_requests'
);

create type public.permission_action as enum ('read', 'create', 'update', 'delete');

-- 'all' = every row in the resource; 'assigned' = rows where the user is the
-- assigned tech/owner; 'own' = rows the user authored. This is the column
-- the audit found missing everywhere except admin_tasks/material_requests.
create type public.permission_scope as enum ('all', 'assigned', 'own', 'none');

-- One row per (role_template, resource, action) grant. Real version in
-- Migration 1 will likely be per-tenant-overridable; assumed here as
-- platform-level defaults only, since that's all dashboard_layouts needs.
create table public.permission_grants (
  role_template public.role_template not null,
  resource public.permission_resource not null,
  action public.permission_action not null,
  scope public.permission_scope not null default 'none',
  primary key (role_template, resource, action)
);

-- Seed reflecting the decisions already made: tech gets assigned-scope reads
-- on workedge_jobs/messages/job_documentation/material_requests and nothing
-- on crm_pipeline/estimates/ar_collections/analytics/social_posting/approvals.
insert into public.permission_grants (role_template, resource, action, scope) values
  ('owner_admin', 'crm_pipeline', 'read', 'all'),
  ('owner_admin', 'estimates', 'read', 'all'),
  ('owner_admin', 'ar_collections', 'read', 'all'),
  ('owner_admin', 'analytics', 'read', 'all'),
  ('owner_admin', 'social_posting', 'read', 'all'),
  ('owner_admin', 'approvals', 'read', 'all'),
  ('owner_admin', 'workedge_jobs', 'read', 'all'),
  ('owner_admin', 'messages', 'read', 'all'),
  ('owner_admin', 'job_documentation', 'read', 'all'),
  ('owner_admin', 'material_requests', 'read', 'all'),

  ('back_office_manager', 'crm_pipeline', 'read', 'all'),
  ('back_office_manager', 'estimates', 'read', 'all'),
  ('back_office_manager', 'ar_collections', 'read', 'all'),
  ('back_office_manager', 'analytics', 'read', 'all'),
  ('back_office_manager', 'social_posting', 'read', 'all'),
  ('back_office_manager', 'social_posting', 'create', 'all'),
  ('back_office_manager', 'social_posting', 'update', 'all'),
  ('back_office_manager', 'workedge_jobs', 'read', 'all'),
  ('back_office_manager', 'messages', 'read', 'all'),
  ('back_office_manager', 'job_documentation', 'read', 'all'),
  ('back_office_manager', 'material_requests', 'read', 'all'),
  -- Client confirmed 2026-08-27: manager DOES get Social Posting by default
  -- (office manager needs to post), reversing the earlier "excluded like
  -- Tech" default. Approvals stays excluded — no delete rights, no
  -- equipment library, no estimates write per the audit still applies there.

  ('tech', 'workedge_jobs', 'read', 'assigned'),
  ('tech', 'messages', 'read', 'assigned'),
  ('tech', 'job_documentation', 'read', 'assigned'),
  ('tech', 'job_documentation', 'create', 'assigned'),
  ('tech', 'material_requests', 'read', 'own'),
  ('tech', 'material_requests', 'create', 'own');

-- Stubbed resolver for "what role_template does this user have in this
-- company". Real Migration 1 replaces this with the fixed get_user_role()
-- (single-role, deterministic) plus the seven->three mapping.
create or replace function public.get_user_role_template(_user_id uuid, _company_id uuid)
returns public.role_template
language sql
stable
security definer
set search_path = public
as $$
  select 'tech'::public.role_template -- placeholder; real impl in Migration 1
$$;


-- =====================================================================
-- THIS MIGRATION — dashboard_layouts and block-permission derivation
-- =====================================================================

-- Registry of every dashboard block that exists. This is the "surface
-- inventory" — analogous to the audit's nav.* keys, but unlike nav.*, a row
-- existing here carries no access grant. It's just the catalog of things
-- that could be shown.
create table public.dashboard_blocks (
  block_id text primary key,
  label text not null,
  description text
);

insert into public.dashboard_blocks (block_id, label, description) values
  ('crm_pipeline', 'CRM Pipeline', 'Leads and pipeline stages'),
  ('estimates', 'Estimates', 'Open and recent estimates'),
  ('ar_collections', 'A/R & Collections', 'Outstanding invoices and aging'),
  ('analytics', 'Analytics', 'Revenue, close rate, and reporting'),
  ('social_posting', 'Social Posting', 'Brand and social post queue'),
  ('approvals', 'Approvals', 'Pending approval queue'),
  ('workedge_board', 'WorkEdge Board', 'Job schedule and dispatch board'),
  ('messages', 'Messages', 'Job-anchored and general channel threads'),
  ('job_documentation', 'Job Documentation', 'Closeout docs, photos, notes'),
  ('material_requests', 'Parts Requests', 'Shopping lists and parts requests');

-- Derivation: which resource+action+min-scope a block requires to be shown
-- at all. A block can require more than one grant (all must be satisfied) --
-- modeled as multiple rows joined by block_id.
create table public.block_permission_requirements (
  block_id text not null references public.dashboard_blocks(block_id) on delete cascade,
  resource public.permission_resource not null,
  action public.permission_action not null default 'read',
  -- the minimum scope that satisfies this requirement; 'none' means no
  -- grant needed (should not normally be used -- every block gates on
  -- something)
  min_scope public.permission_scope not null default 'assigned',
  primary key (block_id, resource, action)
);

insert into public.block_permission_requirements (block_id, resource, action, min_scope) values
  ('crm_pipeline', 'crm_pipeline', 'read', 'all'),
  ('estimates', 'estimates', 'read', 'all'),
  ('ar_collections', 'ar_collections', 'read', 'all'),
  ('analytics', 'analytics', 'read', 'all'),
  ('social_posting', 'social_posting', 'read', 'all'),
  ('approvals', 'approvals', 'read', 'all'),
  ('workedge_board', 'workedge_jobs', 'read', 'assigned'),
  ('messages', 'messages', 'read', 'assigned'),
  ('job_documentation', 'job_documentation', 'read', 'assigned'),
  ('material_requests', 'material_requests', 'read', 'own');

-- Scope ordering, used to check "does the user's grant scope satisfy the
-- block's minimum scope". 'all' satisfies everything; 'assigned' satisfies
-- 'assigned' and 'own'; 'own' satisfies only 'own'; 'none' satisfies nothing.
create or replace function public.scope_satisfies(_have public.permission_scope, _need public.permission_scope)
returns boolean
language sql
immutable
as $$
  select case
    when _have = 'none' then false
    when _need = 'none' then true
    when _have = 'all' then true
    when _have = _need then true
    when _have = 'assigned' and _need = 'own' then true
    else false
  end
$$;

-- The permitted-block list for a user: every block whose requirements are
-- fully satisfied by that user's actual grants for their role in that
-- company. This is the function both the UI (to render customize-mode
-- options) and the layout-write API (to reject an out-of-scope block) call.
-- It is derived, not stored -- there is no "permitted_blocks" table to drift
-- out of sync with permission_grants.
create or replace function public.get_permitted_blocks(_user_id uuid, _company_id uuid)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  with role as (
    select public.get_user_role_template(_user_id, _company_id) as role_template
  ),
  reqs as (
    select block_id, resource, action, min_scope
    from public.block_permission_requirements
  ),
  grants as (
    select pg.resource, pg.action, pg.scope
    from public.permission_grants pg, role
    where pg.role_template = role.role_template
  )
  select r.block_id
  from reqs r
  where not exists (
    -- a block is excluded if ANY of its requirement rows is unsatisfied
    select 1
    from (select distinct block_id, resource, action, min_scope from reqs) rr
    where rr.block_id = r.block_id
      and not exists (
        select 1 from grants g
        where g.resource = rr.resource
          and g.action = rr.action
          and public.scope_satisfies(g.scope, rr.min_scope)
      )
  )
  group by r.block_id
$$;

-- Role-level default block set, matching the decision: tech default is
-- workedge_board + messages + job_documentation + material_requests only.
-- This is what get_permitted_blocks() would also return for 'tech' given the
-- seed grants above -- the defaults table exists so an admin can hand-edit
-- ordering/visibility defaults without touching permission_grants, while
-- get_permitted_blocks() remains the ceiling that always applies regardless
-- of what this table says.
create table public.dashboard_layout_defaults (
  role_template public.role_template not null,
  block_id text not null references public.dashboard_blocks(block_id) on delete cascade,
  position integer not null,
  hidden boolean not null default false,
  primary key (role_template, block_id)
);

insert into public.dashboard_layout_defaults (role_template, block_id, position, hidden) values
  ('owner_admin', 'workedge_board', 0, false),
  ('owner_admin', 'crm_pipeline', 1, false),
  ('owner_admin', 'ar_collections', 2, false),
  ('owner_admin', 'analytics', 3, false),
  ('owner_admin', 'messages', 4, false),
  ('owner_admin', 'estimates', 5, false),
  ('owner_admin', 'approvals', 6, false),
  ('owner_admin', 'social_posting', 7, false),
  ('owner_admin', 'job_documentation', 8, false),
  ('owner_admin', 'material_requests', 9, false),

  ('back_office_manager', 'workedge_board', 0, false),
  ('back_office_manager', 'crm_pipeline', 1, false),
  ('back_office_manager', 'ar_collections', 2, false),
  ('back_office_manager', 'messages', 3, false),
  ('back_office_manager', 'analytics', 4, false),
  ('back_office_manager', 'estimates', 5, false),
  ('back_office_manager', 'social_posting', 6, false),
  ('back_office_manager', 'job_documentation', 7, false),
  ('back_office_manager', 'material_requests', 8, false),

  ('tech', 'workedge_board', 0, false),
  ('tech', 'messages', 1, false),
  ('tech', 'job_documentation', 2, false),
  ('tech', 'material_requests', 3, false);

-- The actual per-user/per-company layout table. A row with user_id = null is
-- the role default for that company (falls back to
-- dashboard_layout_defaults if no company-specific override exists yet); a
-- row with user_id set is that user's personal override. "blocks" carries
-- ordering and hidden flags only -- it is never the source of whether a
-- block is ALLOWED, only whether it's shown/ordered within what's allowed.
create table public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  role_template public.role_template not null,
  user_id uuid, -- null = role-level default for this company
  blocks jsonb not null default '[]'::jsonb,
  -- blocks shape: [{ "block_id": "workedge_board", "position": 0, "hidden": false }, ...]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_layouts_user_role_consistency
    check (user_id is null or role_template is not null)
);

-- One role-default row per (company, role); one override row per
-- (company, user). Partial unique indexes since user_id is nullable and
-- postgres doesn't treat null as equal in a plain unique constraint anyway
-- (which is what we want -- multiple company/role default rows would
-- otherwise be needed, this makes it explicit).
create unique index dashboard_layouts_role_default_uk
  on public.dashboard_layouts (company_id, role_template)
  where user_id is null;

create unique index dashboard_layouts_user_override_uk
  on public.dashboard_layouts (company_id, user_id)
  where user_id is not null;

create index dashboard_layouts_company_idx on public.dashboard_layouts (company_id);

alter table public.dashboard_layouts enable row level security;
alter table public.permission_grants enable row level security;
alter table public.dashboard_layout_defaults enable row level security;
alter table public.dashboard_blocks enable row level security;
alter table public.block_permission_requirements enable row level security;

-- Reference tables: readable by any authenticated user, writable by nobody
-- through the API (managed via migration/admin tooling only).
create policy "dashboard_blocks_read" on public.dashboard_blocks
  for select to authenticated using (true);

create policy "block_permission_requirements_read" on public.block_permission_requirements
  for select to authenticated using (true);

create policy "dashboard_layout_defaults_read" on public.dashboard_layout_defaults
  for select to authenticated using (true);

create policy "permission_grants_read" on public.permission_grants
  for select to authenticated using (true);

-- dashboard_layouts: a user can read their own company's rows (their
-- override + the role default), never another company's. Writes are
-- restricted to your own override row -- nobody edits the role-default row
-- (user_id is null) through this policy; that's an admin-tooling path, not
-- a per-user API path, to avoid a tech being able to overwrite the tech
-- default and hand-craft one wider than get_permitted_blocks() allows.
create policy "dashboard_layouts_select_own_company" on public.dashboard_layouts
  for select to authenticated
  using (
    company_id = (select company_id from public.company_members where user_id = auth.uid() limit 1)
  );

create policy "dashboard_layouts_upsert_own_override" on public.dashboard_layouts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and company_id = (select company_id from public.company_members where user_id = auth.uid() limit 1)
  );

create policy "dashboard_layouts_update_own_override" on public.dashboard_layouts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Resolution: what a specific user should see right now. Merges the user
-- override over the role default over the seeded dashboard_layout_defaults,
-- then filters the result down to get_permitted_blocks() -- so even a stale
-- or hand-edited layout row can never surface a block the user's current
-- grants don't allow. This is the one function the dashboard UI calls; it
-- never trusts a stored "blocks" array on its own.
create or replace function public.get_effective_dashboard_layout(_user_id uuid, _company_id uuid)
returns table (block_id text, position integer, hidden boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _role public.role_template;
  _source jsonb;
begin
  _role := public.get_user_role_template(_user_id, _company_id);

  select l.blocks into _source
  from public.dashboard_layouts l
  where l.company_id = _company_id and l.user_id = _user_id;

  if _source is null then
    select l.blocks into _source
    from public.dashboard_layouts l
    where l.company_id = _company_id and l.user_id is null and l.role_template = _role;
  end if;

  if _source is null then
    return query
    select d.block_id, d.position, d.hidden
    from public.dashboard_layout_defaults d
    where d.role_template = _role
      and d.block_id in (select public.get_permitted_blocks(_user_id, _company_id))
    order by d.position;
    return;
  end if;

  return query
  select
    (b->>'block_id')::text,
    (b->>'position')::integer,
    coalesce((b->>'hidden')::boolean, false)
  from jsonb_array_elements(_source) b
  where (b->>'block_id')::text in (select public.get_permitted_blocks(_user_id, _company_id))
  order by (b->>'position')::integer;
end;
$$;

comment on function public.get_effective_dashboard_layout is
  'Single read path for the dashboard UI. Always filters through get_permitted_blocks() -- a block missing its permission_grants row is never returned here regardless of what is stored in dashboard_layouts.blocks.';
