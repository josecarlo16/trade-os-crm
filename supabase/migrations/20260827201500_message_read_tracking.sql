-- Per-user "last read" marker per conversation, plus a view that turns
-- that + message timestamps into an unread count — used for the unread
-- badge in the Trade OS sidebar and the bold/highlight state in the
-- Messages channel list.
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

create policy "conversation_reads_select_own"
  on public.conversation_reads for select
  using (user_id = auth.uid());

create policy "conversation_reads_upsert_own"
  on public.conversation_reads for insert
  with check (user_id = auth.uid());

create policy "conversation_reads_update_own"
  on public.conversation_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- security_invoker so this view is evaluated under the QUERYING user's RLS
-- (and thus their own conversation_reads row + only the messages they can
-- already see), not the view owner's — without this a view silently
-- bypasses RLS in Postgres.
create or replace view public.conversation_unread_counts
with (security_invoker = true)
as
select
  t.conversation_id,
  count(*) filter (
    where m.created_at > coalesce(cr.last_read_at, 'epoch'::timestamptz)
      and m.author_id is distinct from auth.uid()
  ) as unread_count
from public.messages m
join public.threads t on t.id = m.thread_id
left join public.conversation_reads cr
  on cr.conversation_id = t.conversation_id and cr.user_id = auth.uid()
where m.deleted_at is null
group by t.conversation_id;

alter publication supabase_realtime add table public.conversation_reads;
