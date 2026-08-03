import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface JobStage {
  id: string;
  job_type_id: string;
  name: string;
  stage_type: string;
  color: string;
  sort_order: number;
  auto_notify_customer: boolean;
  is_active: boolean;
}

interface SortableStageRowProps {
  stage: JobStage;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function SortableStageRow({ stage, index, onEdit, onDelete }: SortableStageRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: stage.color }}
      />
      <span className="flex-1 font-medium">{stage.name}</span>
      <Badge variant="outline" className="text-xs">
        {stage.stage_type}
      </Badge>
      {stage.auto_notify_customer && (
        <Badge variant="secondary" className="text-xs">Notify</Badge>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
