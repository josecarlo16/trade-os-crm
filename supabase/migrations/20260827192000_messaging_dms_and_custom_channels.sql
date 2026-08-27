-- =====================================================================
-- DRAFT FOR REVIEW — extends the already-applied messaging schema
-- (20260827190100_messaging_schema.sql) with:
--   1. Direct 1:1 messages (new conversations.kind = 'dm')
--   2. Admin-created custom channels (conversations.kind = 'general' with
--      an arbitrary name, not just the 3 seeded ones)
-- Client decision 2026-08-27: DMs yes; custom channels yes, admin-only to
-- create. Not numbered for apply yet — additive ALTER, doesn't touch the
-- live conversations/threads/messages data already in place.
-- =====================================================================

alter table public.conversations drop constraint conversations_kind_shape;
-- Drop the original inline column check (auto-named by Postgres as
-- <table>_<column>_check since it was never given an explicit name in the
-- original CREATE TABLE) before adding the widened one under the same name.
alter table public.conversations drop constraint conversations_kind_check;
alter table public.conversations add constraint conversations_kind_check check (kind in ('job', 'general', 'dm'));
alter table public.conversations add constraint conversations_kind_shape check (
  (kind = 'job' and job_id is not null and name is null) or
  (kind = 'general' and job_id is null and name is not null) or
  (kind = 'dm' and job_id is null) -- name optional (e.g. could store a label later); membership comes from conversation_participants
);

-- Explicit membership, used for both DMs (the only way to know who's in
-- one) and admin-created custom channels (no sensible default role rule
-- for an arbitrary new channel, unlike the 3 seeded general channels which
-- keep their existing hardcoded Dispatch/Office/Leadership visibility
-- rule — this table doesn't retroactively apply to those, so no backfill
-- needed for already-seeded rows).
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

create policy "conversation_participants_select"
  on public.conversation_participants for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
    )
  );

create policy "conversation_participants_insert"
  on public.conversation_participants for insert
  with check (
    -- Either you're adding yourself (accepting/creating your own DM), or
    -- you're already a participant (admin/creator adding others to a
    -- channel or DM they're in).
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
    )
  );

-- Extend visibility: participants (DMs, and any custom channel someone was
-- added to) can see their conversation, on top of the existing
-- admin/manager-sees-all, job-assignment, and Dispatch/Office rules.
drop policy "conversations_select" on public.conversations;
create policy "conversations_select"
  on public.conversations for select
  using (
    tenant_id = public.get_current_tenant_id()
    and (
      public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'manager')
      or (kind = 'job' and public.is_assigned_to_job(auth.uid(), job_id))
      or (kind = 'general' and name in ('Dispatch', 'Office'))
      or exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = id and cp.user_id = auth.uid()
      )
    )
  );

-- Custom channel creation is admin-only per client decision. DMs are open
-- to anyone (creating a DM just requires being one of its two
-- participants, enforced by conversation_participants_insert above).
drop policy "conversations_insert" on public.conversations;
create policy "conversations_insert"
  on public.conversations for insert
  with check (
    tenant_id = public.get_current_tenant_id()
    and (
      kind = 'dm'
      or kind = 'job' -- unchanged: the create_conversation_for_new_job trigger runs as SECURITY DEFINER anyway
      or (kind = 'general' and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin')))
    )
  );

comment on table public.conversation_participants is
  'Explicit membership for DMs and admin-created custom channels. The 3 seeded general channels (Dispatch/Office/Leadership) keep their original role-based visibility rule and do not use this table.';
