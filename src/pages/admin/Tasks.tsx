import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useTasks, AdminTask } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TaskCreateDialog } from '@/components/admin/command-center/TaskCreateDialog';
import { Plus, Check, Trash2, Search } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const Tasks = () => {
  const { tasks, completeTask, deleteTask, updateTask, loading } = useTasks();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Show all statuses on tasks page (not just active)
  const [allTasks, setAllTasks] = useState<AdminTask[]>([]);
  
  // Use the hook tasks but allow filtering
  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await updateTask(id, { status } as any);
    if (error) toast.error('Failed to update'); else toast.success('Status updated');
  };

  return (
    <AdminLayout title="Tasks">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Task
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28">Due Date</TableHead>
                <TableHead className="w-20">Source</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tasks found</TableCell></TableRow>
              ) : (
                filtered.map(task => {
                  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        {task.status !== 'done' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => completeTask(task.id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{task.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${priorityColors[task.priority]}`} variant="secondary">{task.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={task.status} onValueChange={v => handleStatusChange(task.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-full">
                            <Badge className={`text-[10px] ${statusColors[task.status]}`} variant="secondary">{task.status.replace('_', ' ')}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                            {format(new Date(task.due_date), 'MMM d, yyyy')}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{task.source || 'manual'}</span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => { deleteTask(task.id); toast.success('Task deleted'); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <TaskCreateDialog open={showCreate} onOpenChange={setShowCreate} />
    </AdminLayout>
  );
};

export default Tasks;
