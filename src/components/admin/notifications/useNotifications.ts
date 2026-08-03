import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Notification {
  id: string;
  user_id: string | null;
  category: string;
  title: string;
  message: string | null;
  icon: string | null;
  color: string | null;
  link_url: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  related_entity_id: string | null;
  related_entity_type: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data as unknown as Notification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('admin-notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_notifications',
      }, (payload) => {
        const n = payload.new as unknown as Notification;
        // Only add if it's for this user or broadcast
        if (n.user_id === null || n.user_id === user.id) {
          setNotifications(prev => [n, ...prev].slice(0, 50));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from('admin_notifications').update({ is_read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from('admin_notifications').update({ is_read: true } as any).in('id', ids);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const dismiss = async (id: string) => {
    await supabase.from('admin_notifications').update({ is_dismissed: true } as any).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { notifications, unreadCount, loading, markAsRead, markAllRead, dismiss, refetch: fetchNotifications };
}
