-- =====================================================================
-- DRAFT FOR REVIEW — Trade OS native messaging, Phase 1 per
-- trade-os-messaging-agents-package.md: job-anchored threads + three
-- general channels (Dispatch, Office, Leadership) + mentions + attachments.
-- Not numbered for apply yet.
--
-- Explicitly OUT of scope for this migration (flagged, not silently
-- dropped): translation invocation (needs a Gemini API call — schema below
-- has message_translations ready to receive it), SMS/Twilio escalation,
-- and structured message attachments (schedule cards, equipment records).
-- Those are Phase 2/3 per the doc and need their own design pass.
--
-- Does NOT touch, replace, or read from WorkEdge's existing (unused)
-- messaging feature — separate tables entirely, per client instruction
-- 2026-08-27.
-- =====================================================================

-- Company -> Property -> Project already exist as crm_companies /
-- crm_locations / crm_jobs in this schema — conversations link directly to
-- crm_jobs (job-anchored) or stand alone (general channels), rather than
-- introducing new Property/Project tables that would duplicate what's
-- already there.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.get_current_tenant_id(),
  kind text not null check (kind in ('job', 'general')),
  job_id uuid references public.crm_jobs(id) on delete cascade, -- set only when kind = 'job'
  name text, -- set only when kind = 'general', e.g. 'Dispatch', 'Office', 'Leadership'
  created_at timestamptz not null default now(),
  constraint conversations_kind_shape check (
    (kind = 'job' and job_id is not null and name is null) or
    (kind = 'general' and job_id is null and name is not null)
  )
);

create unique index conversations_one_per_job on public.conversations (job_id) where kind = 'job';
create index conversations_tenant_idx on public.conversations (tenant_id);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  title text, -- null = the conversation's main thread; set = a focused sub-thread
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.get_current_tenant_id(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  author_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index messages_thread_idx on public.messages (thread_id, created_at);

create table public.message_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id)
);

create index message_mentions_user_idx on public.message_mentions (mentioned_user_id);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_type text,
  created_at timestamptz not null default now()
);

-- Schema-ready for the translation feature (store original + derived
-- variants tied to the same message, per the messaging doc). Nothing
-- populates this table yet — no AI call is wired. That's separate work.
create table public.message_translations (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  language text not null,
  translated_body text not null,
  created_at timestamptz not null default now(),
  unique (message_id, language)
);

alter table public.conversations enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.message_mentions enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_translations enable row level security;

-- Visibility rule, matching the Tech default block decision ("messages" is
-- assigned-scope for Tech, all-scope for owner_admin/back_office_manager):
--   - admin/manager: every conversation in their tenant.
--   - tech: job conversations only for jobs they're assigned to
--     (crm_job_assignments -> crm_team_members.user_id), plus Dispatch and
--     Office general channels — NOT Leadership.
-- This depends on crm_job_assignments' own RLS being correct for techs,
-- which the security checklist (Group D) already flagged as broken today
-- ("Tech can't see his own assignment" — crm_job_assignments is SA/A/M-only
-- SELECT). That fix is a prerequisite for this to actually work for techs,
-- not something this migration re-solves.
create or replace function public.is_assigned_to_job(_user_id uuid, _job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crm_job_assignments a
    join public.crm_team_members tm on tm.id = a.member_id
    where a.job_id = _job_id and tm.user_id = _user_id
  )
$$;

create policy "conversations_select"
  on public.conversations for select
  using (
    tenant_id = public.get_current_tenant_id()
    and (
      public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'manager')
      or (kind = 'job' and public.is_assigned_to_job(auth.uid(), job_id))
      or (kind = 'general' and name in ('Dispatch', 'Office'))
    )
  );

create policy "conversations_insert"
  on public.conversations for insert
  with check (tenant_id = public.get_current_tenant_id());

create policy "threads_select"
  on public.threads for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      -- relies on conversations_select above via the same session context
    )
  );

create policy "threads_insert"
  on public.threads for insert
  with check (
    exists (select 1 from public.conversations c where c.id = conversation_id)
  );

create policy "messages_select"
  on public.messages for select
  using (
    tenant_id = public.get_current_tenant_id()
    and exists (
      select 1 from public.threads t
      join public.conversations c on c.id = t.conversation_id
      where t.id = thread_id
    )
  );

create policy "messages_insert"
  on public.messages for insert
  with check (
    tenant_id = public.get_current_tenant_id()
    and author_id = auth.uid()
  );

create policy "message_mentions_select"
  on public.message_mentions for select
  using (exists (select 1 from public.messages m where m.id = message_id));

create policy "message_mentions_insert"
  on public.message_mentions for insert
  with check (exists (select 1 from public.messages m where m.id = message_id and m.author_id = auth.uid()));

create policy "message_attachments_select"
  on public.message_attachments for select
  using (exists (select 1 from public.messages m where m.id = message_id));

create policy "message_attachments_insert"
  on public.message_attachments for insert
  with check (exists (select 1 from public.messages m where m.id = message_id and m.author_id = auth.uid()));

create policy "message_translations_select"
  on public.message_translations for select
  using (exists (select 1 from public.messages m where m.id = message_id));

-- Seed the three general channels per tenant, per the messaging doc
-- ("standing up alongside — available, not mandatory").
insert into public.conversations (tenant_id, kind, name)
select id, 'general', channel_name
from public.tenants
cross join (values ('Dispatch'), ('Office'), ('Leadership')) as c(channel_name);

-- Every job gets its own conversation automatically going forward — mirrors
-- the "job-anchored, additive" scope: a thread exists the moment a job
-- does, nobody has to remember to create one.
create or replace function public.create_conversation_for_new_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversations (tenant_id, kind, job_id)
  values (NEW.tenant_id, 'job', NEW.id)
  on conflict (job_id) where kind = 'job' do nothing;
  return NEW;
end;
$$;

create trigger trigger_create_conversation_for_new_job
  after insert on public.crm_jobs
  for each row execute function public.create_conversation_for_new_job();

comment on table public.conversations is
  'Trade OS native messaging, Phase 1. Separate from and does not read WorkEdge''s existing unused messaging feature.';
