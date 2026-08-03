import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Plus, ListTodo, Trash2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';

interface JobTasksCardProps {
  jobId: string;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function JobTasksCard({ jobId }: JobTasksCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch tasks linked to this job
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['admin_tasks_job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_tasks')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['crm_team_members_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_team_members')
        .select('id, first_name, last_name, role, user_id')
        .eq('is_active', true)
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('admin_tasks').insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      assigned_to: assignedTo && assignedTo !== 'unassigned' ? assignedTo : null,
      job_id: jobId,
      created_by: user?.id,
      source: 'manual',
    } as any);
    setSaving(false);
    if (error) {
      toast.error('Failed to create task');
    } else {
      toast.success('Task created');
      setTitle(''); setDescription(''); setPriority('medium'); setDueDate(''); setAssignedTo('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['admin_tasks_job', jobId] });
    }
  };

  const completeTask = async (id: string) => {
    await supabase.from('admin_tasks').update({ status: 'done' } as any).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin_tasks_job', jobId] });
    toast.success('Task completed');
  };

  const deleteTask = async (id: string) => {
    await supabase.from('admin_tasks').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin_tasks_job', jobId] });
    toast.success('Task deleted');
  };

  const activeTasks = tasks.filter((t: any) => t.status !== 'done');
  const doneTasks = tasks.filter((t: any) => t.status === 'done');

  const getMemberName = (userId: string | null) => {
    if (!userId) return null;
    const member = teamMembers.find((m: any) => m.user_id === userId);
    return member ? `${member.first_name} ${member.last_name || ''}`.trim() : null;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTodo className="h-4 w-4" /> Tasks
            {activeTasks.length > 0 && (
              <Badge variant="secondary" className="text-xs">{activeTasks.length}</Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : activeTasks.length === 0 && doneTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          ) : (
            <>
              {activeTasks.map((task: any) => {
                const isOverdue = task.due_date && isPast(new Date(task.due_date));
                const assigneeName = getMemberName(task.assigned_to);
                return (
                  <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg border bg-card">
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-0.5" onClick={() => completeTask(task.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge className={`text-[10px] ${priorityColors[task.priority]}`} variant="secondary">{task.priority}</Badge>
                        {task.due_date && (
                          <span className={`text-[10px] ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                        {assigneeName && (
                          <span className="text-[10px] text-muted-foreground">→ {assigneeName}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              {doneTasks.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">{doneTasks.length} completed</summary>
                  <div className="space-y-1 mt-1">
                    {doneTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-2 p-1.5 rounded text-muted-foreground">
                        <Check className="h-3 w-3 shrink-0" />
                        <span className="text-xs line-through truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Job Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Task title..." value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Assign to team member..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((m: any) => (
                  <SelectItem key={m.id} value={m.user_id || m.id}>
                    {m.first_name} {m.last_name || ''} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={!title.trim() || saving} className="w-full">
              {saving ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
