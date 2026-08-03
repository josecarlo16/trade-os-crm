import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddToPipelineDialog } from '@/components/admin/pipeline/AddToPipelineDialog';
import { Plus, Pencil, Trash2, DollarSign, Calendar, Kanban } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { logSystemInteraction, SYSTEM_EVENTS } from '@/lib/crm/logInteraction';

interface CustomerPipelineTabProps {
  customerId: string;
}

export const CustomerPipelineTab = ({ customerId }: CustomerPipelineTabProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['customer-pipeline-entries', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipeline_entries')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-pipeline-entries', customerId] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-entries'] });
  };

  const moveMutation = useMutation({
    mutationFn: async ({ entry, newStageId }: { entry: any; newStageId: string }) => {
      const newStage = stages.find((s) => s.id === newStageId);
      const oldStage = stages.find((s) => s.id === entry.stage_id);
      const updateData: Record<string, unknown> = { stage_id: newStageId };
      if (newStage?.is_won_stage) {
        updateData.won_date = new Date().toISOString();
        updateData.lost_date = null;
      } else if (newStage?.is_lost_stage) {
        updateData.lost_date = new Date().toISOString();
        updateData.won_date = null;
      } else {
        updateData.won_date = null;
        updateData.lost_date = null;
      }
      const { error } = await supabase
        .from('crm_pipeline_entries')
        .update(updateData)
        .eq('id', entry.id);
      if (error) throw error;
      await logSystemInteraction({
        customerId,
        type: SYSTEM_EVENTS.PIPELINE_MOVE,
        subject: `Pipeline stage: ${oldStage?.display_name || '—'} → ${newStage?.display_name || '—'}`,
        outcome: newStage?.is_won_stage ? 'Won' : newStage?.is_lost_stage ? 'Lost' : undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Stage updated');
    },
    onError: () => toast.error('Failed to update stage'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_pipeline_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Removed from pipeline');
    },
    onError: () => toast.error('Failed to remove'),
  });

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingEntry(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditingEntry(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Add to Pipeline
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Kanban className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No pipeline entries for this customer yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        entries.map((entry) => {
          const stage = stages.find((s) => s.id === entry.stage_id);
          return (
            <Card key={entry.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {entry.title || 'Untitled opportunity'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added {formatDistanceToNow(new Date(entry.created_at))} ago
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingEntry(entry);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm('Remove this entry from the pipeline?')) {
                          deleteMutation.mutate(entry.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={entry.stage_id}
                    onValueChange={(v) => {
                      if (v !== entry.stage_id) moveMutation.mutate({ entry, newStageId: v });
                    }}
                  >
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                      <SelectValue />
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

                  {entry.probability != null && (
                    <Badge variant="secondary" className="text-xs">
                      {entry.probability}% likely
                    </Badge>
                  )}
                  {stage?.is_won_stage && (
                    <Badge className="bg-green-100 text-green-800 text-xs">Won</Badge>
                  )}
                  {stage?.is_lost_stage && (
                    <Badge variant="destructive" className="text-xs">Lost</Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {entry.estimated_value != null && (
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(Number(entry.estimated_value))}
                    </span>
                  )}
                  {entry.expected_close_date && (
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      Close {format(new Date(entry.expected_close_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                {entry.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {entry.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <AddToPipelineDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingEntry={editingEntry}
        defaultCustomerId={customerId}
      />
    </div>
  );
};
