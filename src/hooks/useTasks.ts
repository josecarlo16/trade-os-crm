import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AdminTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  customer_id: string | null;
  job_id: string | null;
  submission_id: string | null;
  submission_type: string | null;
  pipeline_entry_id: string | null;
  source: string | null;
  source_event: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('admin_tasks')
      .select('*')
      .in('status', ['todo', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false });
    if (data) setTasks(data as unknown as AdminTask[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('admin-tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_tasks' }, () => {
        fetchTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTasks]);

  const createTask = async (task: { title: string; description?: string; priority?: string; due_date?: string; assigned_to?: string; customer_id?: string; job_id?: string }) => {
    const { data, error } = await supabase.from('admin_tasks').insert({ ...task, created_by: user?.id } as any).select().single();
    if (!error && data) setTasks(prev => [data as unknown as AdminTask, ...prev]);
    return { data, error };
  };

  const updateTask = async (id: string, updates: Partial<AdminTask>) => {
    const { error } = await supabase.from('admin_tasks').update(updates as any).eq('id', id);
    if (!error) setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    return { error };
  };

  const completeTask = async (id: string) => updateTask(id, { status: 'done' } as any);

  const deleteTask = async (id: string) => {
    await supabase.from('admin_tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const myTasks = tasks.filter(t => t.assigned_to === user?.id || t.assigned_to === null);
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done');

  return { tasks, myTasks, overdueTasks, loading, createTask, updateTask, completeTask, deleteTask, refetch: fetchTasks };
}
