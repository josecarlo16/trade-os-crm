import { useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, freshChannel } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantUsers } from '@/hooks/useTenantUsers';
import { RoleGate } from '@/components/tradeos/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Send, Plus, Hash, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useUnreadMessages, useMarkConversationRead } from '@/hooks/useUnreadMessages';

interface ConversationRow {
  id: string;
  kind: 'job' | 'general' | 'dm';
  name: string | null;
  job_id: string | null;
  crm_jobs: { job_number: string; title: string } | null;
}

interface MessageRow {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
}

const SEEDED_CHANNELS = new Set(['Dispatch', 'Office', 'Leadership']);

function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, kind, name, job_id, crm_jobs(job_number, title)')
        .order('kind', { ascending: false });
      if (error) throw error;
      return data as ConversationRow[];
    },
  });
}

/** All conversation_participants rows for conversations the current user can see — RLS already scopes this to "mine". */
function useMyParticipants() {
  return useQuery({
    queryKey: ['conversation_participants', 'mine'],
    queryFn: async () => {
      const { data, error } = await supabase.from('conversation_participants').select('conversation_id, user_id');
      if (error) throw error;
      return data as { conversation_id: string; user_id: string }[];
    },
  });
}

function useMainThread(conversationId: string | null) {
  return useQuery({
    enabled: !!conversationId,
    queryKey: ['thread', conversationId],
    queryFn: async () => {
      const existing = await supabase
        .from('threads')
        .select('id')
        .eq('conversation_id', conversationId)
        .is('title', null)
        .maybeSingle();
      if (existing.error) throw existing.error;
      let thread = existing.data;
      if (!thread) {
        const insertRes = await supabase.from('threads').insert({ conversation_id: conversationId }).select('id').single();
        if (insertRes.error) throw insertRes.error;
        thread = insertRes.data;
      }
      return thread as { id: string };
    },
  });
}

function ThreadView({ threadId, conversationId }: { threadId: string; conversationId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const markRead = useMarkConversationRead();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, body, created_at, author_id')
        .eq('thread_id', threadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as MessageRow[];
    },
  });

  // Mark read on open, and again whenever a new message lands while this
  // thread is the one open — otherwise the unread badge would come right
  // back the moment someone replies.
  useEffect(() => {
    if (messages.length > 0) markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from('messages').insert({ thread_id: threadId, author_id: user?.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft('');
      // No manual cache update here — the realtime subscription below
      // catches this same INSERT (for sender and recipient alike) and
      // refetches, so both sides update the same way rather than the
      // sender taking a different, faster path than everyone else.
    },
    onError: (error: Error) => toast.error('Failed to send: ' + error.message),
  });

  // Live updates: any INSERT into this thread's messages — from either
  // side of the conversation — refetches instead of requiring a manual
  // page reload.
  useEffect(() => {
    const channel = freshChannel(`thread-messages-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', threadId] });
          queryClient.invalidateQueries({ queryKey: ['messages', 'preview'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  return (
    <div className="flex h-[480px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-sm text-tradeos-ink-3">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-tradeos-ink-3">No messages yet — say something.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.author_id === user?.id ? 'ml-auto bg-tradeos-accent text-white' : 'bg-tradeos-surface-2 text-tradeos-ink'}`}>
              <p>{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.author_id === user?.id ? 'text-white/70' : 'text-tradeos-ink-3'}`}>{format(new Date(m.created_at), 'MMM d, h:mma')}</p>
            </div>
          ))
        )}
      </div>
      <form
        className="flex gap-2 border-t border-tradeos-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) sendMutation.mutate(draft.trim());
        }}
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message…" className="flex-1" />
        <Button type="submit" size="icon" disabled={sendMutation.isPending || !draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function NewMessageDialog({ onStarted }: { onStarted: (conversationId: string) => void }) {
  const { user } = useAuth();
  const { data: tenantUsers = [] } = useTenantUsers();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (!selected || !user) return;
    setStarting(true);
    try {
      // Reuse an existing DM with this person if one exists, rather than
      // creating a duplicate thread every time someone hits "New Message".
      const mine = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id);
      if (mine.error) throw mine.error;
      const theirs = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', selected);
      if (theirs.error) throw theirs.error;
      const mineIds = new Set(mine.data.map((r) => r.conversation_id));
      const sharedIds = theirs.data.map((r) => r.conversation_id).filter((id) => mineIds.has(id));

      let conversationId: string | null = null;
      if (sharedIds.length > 0) {
        const existingDm = await supabase.from('conversations').select('id').in('id', sharedIds).eq('kind', 'dm').limit(1).maybeSingle();
        if (existingDm.error) throw existingDm.error;
        conversationId = existingDm.data?.id ?? null;
      }

      if (!conversationId) {
        const created = await supabase.from('conversations').insert({ kind: 'dm' }).select('id').single();
        if (created.error) throw created.error;
        conversationId = created.data.id;
        // Insert self first, in its own statement — the "am I already a
        // participant" RLS check on the second insert can't see rows from
        // earlier in the SAME statement, only from earlier statements in
        // the transaction, so these must be two separate calls, not one
        // batched insert of both rows.
        const self = await supabase.from('conversation_participants').insert({ conversation_id: conversationId, user_id: user.id });
        if (self.error) throw self.error;
        const other = await supabase.from('conversation_participants').insert({ conversation_id: conversationId, user_id: selected });
        if (other.error) throw other.error;
      }

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation_participants'] });
      setOpen(false);
      setSelected(null);
      onStarted(conversationId);
    } catch (e) {
      toast.error('Failed to start message: ' + (e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-tradeos-ink-2">
          <MessageCircle className="h-3.5 w-3.5" /> New Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New direct message</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {tenantUsers.map((u) => (
            <button
              key={u.user_id}
              type="button"
              onClick={() => setSelected(u.user_id)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selected === u.user_id ? 'bg-tradeos-accent/15 font-semibold text-tradeos-accent-ink' : 'hover:bg-muted'}`}
            >
              <span>{u.email}</span>
              <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
            </button>
          ))}
          {tenantUsers.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No other users found.</p>}
        </div>
        <DialogFooter>
          <Button type="button" onClick={start} disabled={!selected || starting}>
            {starting ? 'Starting…' : 'Start conversation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewChannelDialog({ onCreated }: { onCreated: (conversationId: string) => void }) {
  const { user } = useAuth();
  const { data: tenantUsers = [] } = useTenantUsers();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const create = async () => {
    if (!name.trim() || !user) return;
    setCreating(true);
    try {
      const created = await supabase.from('conversations').insert({ kind: 'general', name: name.trim() }).select('id').single();
      if (created.error) throw created.error;
      const conversationId = created.data.id;
      // Self first, own statement — same reason as NewMessageDialog: a
      // batched multi-row insert can't see its own earlier rows for the
      // RLS "already a participant" check.
      const self = await supabase.from('conversation_participants').insert({ conversation_id: conversationId, user_id: user.id });
      if (self.error) throw self.error;
      if (picked.size > 0) {
        const rows = Array.from(picked).map((uid) => ({ conversation_id: conversationId, user_id: uid }));
        const others = await supabase.from('conversation_participants').insert(rows);
        if (others.error) throw others.error;
      }

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setOpen(false);
      setName('');
      setPicked(new Set());
      onCreated(conversationId);
    } catch (e) {
      toast.error('Failed to create channel: ' + (e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-tradeos-ink-2">
          <Plus className="h-3.5 w-3.5" /> New Channel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New channel</DialogTitle>
        </DialogHeader>
        <Input placeholder="Channel name" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add people</p>
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {tenantUsers.map((u) => (
            <label key={u.user_id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <Checkbox checked={picked.has(u.user_id)} onCheckedChange={() => toggle(u.user_id)} />
              {u.email}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" onClick={create} disabled={!name.trim() || creating}>
            {creating ? 'Creating…' : 'Create channel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelRow({
  active,
  unread,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  unread: number;
  onClick: () => void;
  icon?: ReactNode;
  label: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
        active ? 'bg-tradeos-accent/15 text-tradeos-accent-ink font-semibold' : unread > 0 ? 'font-semibold text-tradeos-ink' : 'text-tradeos-ink-2 hover:bg-tradeos-surface-2'
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {unread > 0 && (
        <span className="flex h-4 min-w-[16px] flex-none items-center justify-center rounded-full bg-tradeos-accent px-1 font-tradeMono text-[10px] font-semibold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}

function MessagesContent() {
  const { data: conversations = [], isLoading, isError } = useConversations();
  const { data: participants = [] } = useMyParticipants();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { data: tenantUsers = [] } = useTenantUsers();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: thread } = useMainThread(activeId);
  const queryClient = useQueryClient();
  const { byConversation: unreadByConversation } = useUnreadMessages();

  // Live updates: a new DM/channel someone started with you, or a job
  // thread's conversation being created, shows up without a reload.
  useEffect(() => {
    if (!user) return;
    const channel = freshChannel('trade-os-conversations-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['conversation_participants', 'mine'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  if (isLoading) return <p className="text-sm text-tradeos-ink-3">Loading…</p>;

  if (isError) {
    return (
      <Card className="bg-tradeos-surface border-tradeos-line">
        <CardContent className="py-10 text-center text-sm text-tradeos-ink-3">
          Couldn't load messages. Try refreshing the page.
        </CardContent>
      </Card>
    );
  }

  const emailFor = (uid: string) => tenantUsers.find((u) => u.user_id === uid)?.email ?? 'Someone';
  const dmLabel = (conversationId: string) => {
    const other = participants.find((p) => p.conversation_id === conversationId && p.user_id !== user?.id);
    return other ? emailFor(other.user_id) : 'Direct message';
  };

  const seededConversations = conversations.filter((c) => c.kind === 'general' && SEEDED_CHANNELS.has(c.name ?? ''));
  const customConversations = conversations.filter((c) => c.kind === 'general' && !SEEDED_CHANNELS.has(c.name ?? ''));
  const jobConversations = conversations.filter((c) => c.kind === 'job');
  const dmConversations = conversations.filter((c) => c.kind === 'dm');
  const active = conversations.find((c) => c.id === activeId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="bg-tradeos-surface border-tradeos-line">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-tradeos-line py-3">
          <CardTitle className="font-condensed text-sm font-bold uppercase tracking-wider text-tradeos-ink">Channels</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-1 border-b border-tradeos-line px-1 py-1">
          <NewMessageDialog onStarted={setActiveId} />
          {(isAdmin || isSuperAdmin) && <NewChannelDialog onCreated={setActiveId} />}
        </div>
        <CardContent className="p-2">
          <p className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-tradeos-ink-3">General</p>
          {seededConversations.map((c) => (
            <ChannelRow key={c.id} active={activeId === c.id} unread={unreadByConversation.get(c.id) ?? 0} onClick={() => setActiveId(c.id)} label={c.name} />
          ))}

          {customConversations.length > 0 && (
            <>
              <p className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-tradeos-ink-3">Custom</p>
              {customConversations.map((c) => (
                <ChannelRow
                  key={c.id}
                  active={activeId === c.id}
                  unread={unreadByConversation.get(c.id) ?? 0}
                  onClick={() => setActiveId(c.id)}
                  icon={<Hash className="h-3.5 w-3.5 flex-none opacity-60" />}
                  label={c.name}
                />
              ))}
            </>
          )}

          <p className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-tradeos-ink-3">Direct</p>
          {dmConversations.length === 0 && <p className="px-2 py-1 text-xs text-tradeos-ink-3">No direct messages yet.</p>}
          {dmConversations.map((c) => (
            <ChannelRow key={c.id} active={activeId === c.id} unread={unreadByConversation.get(c.id) ?? 0} onClick={() => setActiveId(c.id)} label={dmLabel(c.id)} />
          ))}

          <p className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-tradeos-ink-3">Jobs</p>
          {jobConversations.length === 0 && <p className="px-2 py-1 text-xs text-tradeos-ink-3">No job threads yet.</p>}
          {jobConversations.map((c) => (
            <ChannelRow
              key={c.id}
              active={activeId === c.id}
              unread={unreadByConversation.get(c.id) ?? 0}
              onClick={() => setActiveId(c.id)}
              label={`${c.crm_jobs?.job_number} — ${c.crm_jobs?.title}`}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="bg-tradeos-surface border-tradeos-line">
        {active ? (
          <>
            <CardHeader className="flex flex-row items-center gap-2 border-b border-tradeos-line py-3">
              <CardTitle className="font-condensed text-sm font-bold uppercase tracking-wider text-tradeos-ink">
                {active.kind === 'job' ? `${active.crm_jobs?.job_number} — ${active.crm_jobs?.title}` : active.kind === 'dm' ? dmLabel(active.id) : active.name}
              </CardTitle>
              <Badge variant="outline" className="ml-auto border-tradeos-line-strong text-tradeos-ink-3">{active.kind}</Badge>
            </CardHeader>
            <CardContent className="p-0">{thread ? <ThreadView threadId={thread.id} conversationId={active.id} /> : <p className="p-4 text-sm text-tradeos-ink-3">Loading thread…</p>}</CardContent>
          </>
        ) : (
          <CardContent className="py-16 text-center text-sm text-tradeos-ink-3">Pick a channel, DM, or job thread on the left.</CardContent>
        )}
      </Card>
    </div>
  );
}

export default function TradeOSMessagesPage() {
  return (
    <RoleGate block="messages" title="Messages">
      <MessagesContent />
    </RoleGate>
  );
}
