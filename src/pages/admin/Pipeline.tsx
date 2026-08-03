import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { logSystemInteraction, SYSTEM_EVENTS } from '@/lib/crm/logInteraction';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineColumn } from '@/components/admin/pipeline/PipelineColumn';
import { PipelineCard } from '@/components/admin/pipeline/PipelineCard';
import { AddToPipelineDialog } from '@/components/admin/pipeline/AddToPipelineDialog';
import { Plus, Kanban, DollarSign, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

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

const Pipeline = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PipelineEntry | null>(null);
  const [activeEntry, setActiveEntry] = useState<PipelineEntry | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch pipeline stages
  const { data: stages = [], isLoading: stagesLoading } = useQuery({
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

  // Fetch pipeline entries with customer data
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['pipeline-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipeline_entries')
        .select(`
          id,
          customer_id,
          stage_id,
          title,
          estimated_value,
          probability,
          expected_close_date,
          notes,
          created_at,
          customer:crm_customers!inner(
            id,
            first_name,
            last_name,
            company_name,
            email,
            phone,
            customer_type
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as PipelineEntry[];
    },
  });

  // Move entry mutation
  const moveMutation = useMutation({
    mutationFn: async ({ entryId, newStageId, oldStageId }: { entryId: string; newStageId: string; oldStageId: string }) => {
      const newStage = stages.find(s => s.id === newStageId);
      const oldStage = stages.find(s => s.id === oldStageId);
      const entry = entries.find(e => e.id === entryId);
      
      const updateData: Record<string, unknown> = { stage_id: newStageId };
      
      // Set won/lost dates if moving to those stages
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
        .eq('id', entryId);
      
      if (error) throw error;

      // Log the stage transition
      if (entry) {
        await logSystemInteraction({
          customerId: entry.customer_id,
          type: SYSTEM_EVENTS.PIPELINE_MOVE,
          subject: `Pipeline stage: ${oldStage?.display_name || 'Unknown'} → ${newStage?.display_name || 'Unknown'}`,
          content: entry.estimated_value 
            ? `Deal value: $${entry.estimated_value.toLocaleString()}`
            : undefined,
          outcome: newStage?.is_won_stage ? 'Won' : newStage?.is_lost_stage ? 'Lost' : undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-entries'] });
    },
    onError: () => {
      toast.error('Failed to move entry');
    },
  });

  // Delete entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('crm_pipeline_entries')
        .delete()
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-entries'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-available-customers'] });
      toast.success('Entry removed from pipeline');
    },
    onError: () => {
      toast.error('Failed to remove entry');
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const entry = entries.find(e => e.id === event.active.id);
    setActiveEntry(entry || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEntry(null);
    
    const { active, over } = event;
    if (!over) return;

    const entryId = active.id as string;
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    // Check if dropped on a stage column
    const newStageId = over.id as string;
    const isStage = stages.some(s => s.id === newStageId);
    
    if (isStage && newStageId !== entry.stage_id) {
      moveMutation.mutate({ entryId, newStageId, oldStageId: entry.stage_id });
    }
  };

  const handleEditEntry = (entry: PipelineEntry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleDeleteEntry = (entryId: string) => {
    if (confirm('Remove this lead from the pipeline?')) {
      deleteMutation.mutate(entryId);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingEntry(null);
    }
  };

  // Calculate pipeline metrics
  const totalValue = entries.reduce((sum, e) => sum + (e.estimated_value || 0), 0);
  const weightedValue = entries.reduce((sum, e) => {
    const value = e.estimated_value || 0;
    const prob = (e.probability || 50) / 100;
    return sum + (value * prob);
  }, 0);
  const wonStage = stages.find(s => s.is_won_stage);
  const wonEntries = wonStage 
    ? entries.filter(e => e.stage_id === wonStage.id) 
    : [];
  const wonValue = wonEntries.reduce((sum, e) => sum + (e.estimated_value || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isLoading = stagesLoading || entriesLoading;

  return (
    <AdminLayout title="Sales Pipeline">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
            <p className="text-muted-foreground">
              Track leads through your sales process
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add to Pipeline
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entries.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pipeline Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Weighted Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(weightedValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Kanban className="h-4 w-4" />
                Won This Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(wonValue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-[500px]" />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Kanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Pipeline Stages</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                Pipeline stages need to be configured in the database.
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto pb-4 -mx-4 px-4">
              <div className="flex gap-4" style={{ minWidth: `${stages.length * 260 + (stages.length - 1) * 16}px` }}>
                {stages.map((stage) => (
                  <div key={stage.id} className="w-[260px] shrink-0">
                    <PipelineColumn
                      stage={stage}
                      stages={stages}
                      entries={entries.filter(e => e.stage_id === stage.id)}
                      onEditEntry={handleEditEntry}
                      onDeleteEntry={handleDeleteEntry}
                      onChangeStage={(entryId, newStageId, oldStageId) =>
                        moveMutation.mutate({ entryId, newStageId, oldStageId })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeEntry && (
                <div className="w-[240px] opacity-90">
                  <PipelineCard
                    entry={activeEntry}
                    stages={stages}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onChangeStage={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <AddToPipelineDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingEntry={editingEntry}
      />
    </AdminLayout>
  );
};

export default Pipeline;
