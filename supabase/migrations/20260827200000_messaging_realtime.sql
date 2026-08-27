-- Enable realtime on the messaging tables so the UI updates live instead
-- of requiring a manual refresh — same mechanism already used for
-- admin_notifications/admin_tasks (see
-- 20260211193806_f0b9e754-da79-4d77-8b3b-35262040ac6b.sql).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_participants;
