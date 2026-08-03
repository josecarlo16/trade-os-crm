import { useTasks } from '@/hooks/useTasks';
import { TaskItem } from './TaskItem';
import { TaskCreateDialog } from './TaskCreateDialog';
import { Button } from '@/components/ui/button';
import { Plus, ListChecks } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const TaskPanel = () => {
  const { myTasks, completeTask, loading } = useTasks();
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-[#1e3a5f]" />
          <h3 className="font-semibold text-sm">My Tasks</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/admin/tasks')}>View All</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : myTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No tasks — you're all caught up!</p>
        ) : (
          myTasks.slice(0, 5).map(task => (
            <TaskItem key={task.id} task={task} onComplete={completeTask} />
          ))
        )}
      </div>
      <TaskCreateDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
};
