import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface PreviewMessage {
  id: string;
  body: string;
  created_at: string;
  thread_id: string;
  threads: {
    conversation_id: string;
    conversations: { name: string | null; kind: string; job_id: string | null; crm_jobs?: { job_number: string } | null } | null;
  } | null;
}

export function MessagesPreviewCard() {
  const { data: messages = [], isLoading, isError } = useQuery({
    queryKey: ['messages', 'preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, body, created_at, thread_id, threads(conversation_id, conversations(name, kind, job_id, crm_jobs(job_number)))')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as PreviewMessage[];
    },
  });

  if (isLoading) return <p className="text-sm text-tradeos-ink-3">Loading…</p>;

  if (isError) {
    return (
      <p className="text-xs text-tradeos-ink-3">Couldn't load messages.</p>
    );
  }

  if (messages.length === 0) {
    return <p className="text-sm text-tradeos-ink-3">No messages yet.</p>;
  }

  return (
    <div className="divide-y divide-tradeos-line">
      {messages.map((m) => {
        const conv = m.threads?.conversations;
        const label = conv?.kind === 'job' ? conv.crm_jobs?.job_number ?? 'Job' : conv?.name ?? '';
        return (
          <div key={m.id} className="py-2 first:pt-0 last:pb-0">
            <div className="mb-0.5 flex items-baseline gap-2">
              <span className="text-xs font-semibold text-tradeos-accent-ink">{label}</span>
              <span className="ml-auto text-[10.5px] text-tradeos-ink-3">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
            </div>
            <p className="truncate text-xs text-tradeos-ink-2">{m.body}</p>
          </div>
        );
      })}
    </div>
  );
}
