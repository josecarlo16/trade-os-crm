import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { format, isPast } from 'date-fns';
import type { AdminTask } from '@/hooks/useTasks';

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

interface Props {
  task: AdminTask;
  onComplete: (id: string) => void;
}

export const TaskItem = ({ task, onComplete }: Props) => {
  const isOverdue = task.due_date && isPast(new Date(task.due_date));

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onComplete(task.id)}
      >
        <Check className="h-3 w-3" />
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{task.title}</p>
        {task.due_date && (
          <p className={`text-[10px] ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {isOverdue ? 'Overdue: ' : 'Due: '}{format(new Date(task.due_date), 'MMM d')}
          </p>
        )}
      </div>
      <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority] || ''}`} variant="secondary">
        {task.priority}
      </Badge>
    </div>
  );
};
