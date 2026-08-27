-- BUG FIX: conversation_participants_select and conversation_participants_insert
-- (from 20260827192000_messaging_dms_and_custom_channels.sql) both query
-- public.conversation_participants from within a policy defined ON
-- public.conversation_participants — Postgres detects this as infinite
-- recursion and every query against the table (and conversations, whose
-- own SELECT policy checks conversation_participants) returns a 500.
--
-- Fix: route the "am I already a participant in this conversation" check
-- through a SECURITY DEFINER function, the same pattern already used by
-- has_role()/is_assigned_to_job() elsewhere in this schema — a
-- SECURITY DEFINER function's internal query is not subject to the
-- calling role's RLS, so it can't recurse into the policy that calls it.

create or replace function public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = _conversation_id and user_id = _user_id
  )
$$;

drop policy "conversation_participants_select" on public.conversation_participants;
create policy "conversation_participants_select"
  on public.conversation_participants for select
  using (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id, auth.uid())
  );

drop policy "conversation_participants_insert" on public.conversation_participants;
create policy "conversation_participants_insert"
  on public.conversation_participants for insert
  with check (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id, auth.uid())
  );
