import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { DraggableJobCard } from './DraggableJobCard';
import { cn } from '@/lib/utils';

interface Stage {
  id: string;
  name: string;
  color: string;
}

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

interface DroppableStageColumnProps {
  stage: Stage;
  jobs: Job[];
}

export function DroppableStageColumn({ stage, jobs }: DroppableStageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex flex-col flex-1 min-w-[240px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color || '#6B7280' }}
          />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
        </div>
        <Badge variant="secondary">{jobs.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-3 p-2 bg-muted/30 rounded-lg min-h-[500px] transition-colors",
          isOver && "ring-2 ring-primary/60 ring-offset-2 bg-primary/5"
        )}
      >
        <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map(job => (
            <DraggableJobCard key={job.id} job={job} />
          ))}
        </SortableContext>
        {jobs.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[100px] border border-dashed rounded-lg">
            <p className="text-xs text-muted-foreground">Drop jobs here</p>
          </div>
        )}
      </div>
    </div>
  );
}
