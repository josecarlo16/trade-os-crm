import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, freshChannel } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UnreadRow {
  conversation_id: string;
  unread_count: number;
}

/**
 * Per-conversation and total unread counts, backed by the
 * conversation_unread_counts view (message timestamps vs. each user's own
 * conversation_reads.last_read_at). Live via realtime — no polling.
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversation_unread_counts'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('conversation_unread_counts').select('conversation_id, unread_count');
      if (error) throw error;
      return (data || []) as UnreadRow[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = freshChannel('trade-os-unread-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversation_unread_counts'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_reads', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversation_unread_counts'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const byConversation = new Map((query.data ?? []).map((r) => [r.conversation_id, r.unread_count]));
  const total = (query.data ?? []).reduce((sum, r) => sum + r.unread_count, 0);

  return { byConversation, total, isLoading: query.isLoading };
}

export function useMarkConversationRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('conversation_reads')
        .upsert({ conversation_id: conversationId, user_id: user.id, last_read_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation_unread_counts'] });
    },
  });
}
