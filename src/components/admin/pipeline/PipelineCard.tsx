import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GripVertical, 
  DollarSign, 
  Calendar, 
  MoreHorizontal,
  Phone,
  Mail,
  Pencil,
  Trash2,
  Briefcase,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
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

interface PipelineCardProps {
  entry: PipelineEntry;
  stages: PipelineStage[];
  onEdit: (entry: PipelineEntry) => void;
  onDelete: (entryId: string) => void;
  onChangeStage: (entryId: string, newStageId: string, oldStageId: string) => void;
}

export const PipelineCard = ({ entry, stages, onEdit, onDelete, onChangeStage }: PipelineCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  // Fetch linked jobs and estimates for this pipeline entry
  const { data: linkedJobs = [] } = useQuery({
    queryKey: ['pipeline-linked-jobs', entry.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('crm_jobs')
        .select('id, job_number, source_estimate_id')
        .eq('source_pipeline_id', entry.id)
        .is('deleted_at', null);
      return data || [];
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const customerName = entry.customer.company_name || 
    `${entry.customer.first_name || ''} ${entry.customer.last_name || ''}`.trim() || 
    'Unknown';

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
      ref={setNodeRef}
      style={style}
      className="bg-card border rounded-lg shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="p-3">
        {/* Header: title/name + actions */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-1.5 min-w-0 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              {entry.title && (
                <p className="font-semibold text-sm truncate leading-tight">{entry.title}</p>
              )}
              <Link
                to={`/admin/customers/${entry.customer_id}`}
                className={cn(
                  "hover:text-primary truncate block transition-colors",
                  entry.title ? "text-xs text-muted-foreground" : "font-semibold text-sm"
                )}
              >
                {customerName}
              </Link>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(entry)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(entry.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Type badge + probability */}
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 capitalize">
            {entry.customer.customer_type}
          </Badge>
          {entry.probability != null && (
            <span className="text-[10px] text-muted-foreground">
              {entry.probability}% likely
            </span>
          )}
          {entry.created_at && (() => {
            const days = differenceInDays(new Date(), new Date(entry.created_at));
            const stale = days >= 14;
            const warm = days >= 7;
            return (
              <span
                className={cn(
                  "text-[10px] ml-auto font-medium",
                  stale ? "text-destructive" : warm ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                )}
                title={`Added ${format(new Date(entry.created_at), 'MMM d, yyyy')}`}
              >
                {days === 0 ? 'Today' : `${formatDistanceToNow(new Date(entry.created_at))} old`}
              </span>
            );
          })()}
        </div>

        {/* Stage selector */}
        <div className="mt-2" onPointerDown={(e) => e.stopPropagation()}>
          <Select
            value={entry.stage_id}
            onValueChange={(newStageId) => {
              if (newStageId !== entry.stage_id) {
                onChangeStage(entry.id, newStageId, entry.stage_id);
              }
            }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Change stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.display_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        {/* Value */}
        {entry.estimated_value != null && (
          <div className="flex items-center gap-1 mt-2 text-sm font-bold text-primary">
            <DollarSign className="h-3.5 w-3.5" />
            {formatCurrency(entry.estimated_value)}
          </div>
        )}

        {/* Linked jobs/estimates badges */}
        {linkedJobs.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {linkedJobs.map((job: any) => (
              <Link key={job.id} to={`/admin/jobs/${job.id}`} onClick={(e) => e.stopPropagation()}>
                <Badge variant="outline" className="text-[9px] px-1.5 h-4 gap-0.5 hover:bg-accent cursor-pointer">
                  <Briefcase className="h-2.5 w-2.5" />
                  {job.job_number}
                </Badge>
              </Link>
            ))}
            {linkedJobs.some((j: any) => j.source_estimate_id) && (
              <Badge variant="outline" className="text-[9px] px-1.5 h-4 gap-0.5 bg-accent/50">
                <FileText className="h-2.5 w-2.5" />
                Est
              </Badge>
            )}
          </div>
        )}

        {/* Close date + contact icons row */}
        <div className="flex items-center justify-between mt-2">
          {entry.expected_close_date ? (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(entry.expected_close_date), 'MMM d, yyyy')}
            </div>
          ) : <div />}
          
          <div className="flex items-center gap-1.5">
            {entry.customer.phone && (
              <a 
                href={`tel:${entry.customer.phone}`}
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            )}
            {entry.customer.email && (
              <a 
                href={`mailto:${entry.customer.email}`}
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Notes preview */}
        {entry.notes && (
          <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {entry.notes}
          </p>
        )}
      </div>
    </div>
  );
};
