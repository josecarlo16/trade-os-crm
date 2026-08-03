import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, User, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  job_number: string;
  title: string;
  priority: string;
  scheduled_start: string | null;
  quoted_amount: number | null;
  job_type: { color: string } | null;
  customer: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;
}

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/10 text-slate-600',
  normal: 'bg-blue-500/10 text-blue-600',
  high: 'bg-orange-500/10 text-orange-600',
  urgent: 'bg-red-500/10 text-red-600',
};

export function DraggableJobCard({ job }: { job: Job }) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const customerName = job.customer?.company_name ||
    `${job.customer?.first_name || ''} ${job.customer?.last_name || ''}`.trim() || 'Unknown';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        isDragging && "opacity-50 ring-2 ring-primary shadow-lg z-50"
      )}
      onClick={() => navigate(`/admin/jobs/${job.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">{job.job_number}</span>
          </div>
          <Badge className={priorityColors[job.priority]}>{job.priority}</Badge>
        </div>
        <h4 className="font-medium text-sm line-clamp-2">{job.title}</h4>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          {customerName}
        </div>
        {job.scheduled_start && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(job.scheduled_start), 'MMM d, yyyy')}
          </div>
        )}
        {job.quoted_amount && (
          <div className="flex items-center gap-1 text-xs font-medium">
            <DollarSign className="h-3 w-3" />
            ${job.quoted_amount.toLocaleString()}
          </div>
        )}
        <div
          className="w-full h-1 rounded-full mt-2"
          style={{ backgroundColor: job.job_type?.color || '#3B82F6' }}
        />
      </CardContent>
    </Card>
  );
}
