import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PipelineCard } from './PipelineCard';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: string;
  name: string;
  display_name: string;
  color: string;
  sort_order: number;
  is_won_stage: boolean | null;
  is_lost_stage: boolean | null;
}

interface PipelineEntry {
  id: string;
  customer_id: string;
  stage_id: string;
  title: string | null;
  estimated_value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  customer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    customer_type: string;
  };
}

interface PipelineColumnProps {
  stage: PipelineStage;
  stages: PipelineStage[];
  entries: PipelineEntry[];
  onEditEntry: (entry: PipelineEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onChangeStage: (entryId: string, newStageId: string, oldStageId: string) => void;
}

export const PipelineColumn = ({ 
  stage, 
  stages,
  entries, 
  onEditEntry, 
  onDeleteEntry,
  onChangeStage,
}: PipelineColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const totalValue = entries.reduce((sum, e) => sum + (e.estimated_value || 0), 0);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div 
      className={cn(
        "min-h-[520px] flex flex-col rounded-xl border bg-muted/20 transition-all",
        isOver && "ring-2 ring-primary/60 ring-offset-2 bg-primary/5"
      )}
    >
      {/* Column header with colored top bar */}
      <div 
        className="h-1.5 rounded-t-xl" 
        style={{ backgroundColor: stage.color }}
      />
      <div className="px-3 py-3 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {stage.display_name}
            </span>
          </div>
          <span className="text-xs font-medium bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
            {entries.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground font-medium">
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>
      
      {/* Cards area */}
      <div 
        ref={setNodeRef}
        className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto"
      >
        <SortableContext 
          items={entries.map(e => e.id)} 
          strategy={verticalListSortingStrategy}
        >
          {entries.map((entry) => (
            <PipelineCard
              key={entry.id}
              entry={entry}
              stages={stages}
              onEdit={onEditEntry}
              onDelete={onDeleteEntry}
              onChangeStage={onChangeStage}
            />
          ))}
        </SortableContext>
        
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg bg-background/30">
            <p className="text-xs text-muted-foreground">
              Drop leads here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
