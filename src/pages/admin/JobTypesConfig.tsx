import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Wrench, ClipboardCheck, Settings, Home, Building, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStageRow } from '@/components/admin/job-types/SortableStageRow';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package, Wrench, ClipboardCheck, Settings, Home, Building
};

interface JobType {
  id: string;
  category: string;
  name: string;
  slug: string;
  default_duration_hours: number;
  default_priority: string;
  requires_permit: boolean;
  icon_name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

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

export default function JobTypesConfig() {
  const queryClient = useQueryClient();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<JobType | null>(null);
  const [editingStage, setEditingStage] = useState<JobStage | null>(null);

  const { data: jobTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['crm_job_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_types')
        .select('*')
        .order('category')
        .order('sort_order');
      if (error) throw error;
      return data as JobType[];
    }
  });

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ['crm_job_stages', selectedTypeId],
    queryFn: async () => {
      if (!selectedTypeId) return [];
      const { data, error } = await supabase
        .from('crm_job_stages')
        .select('*')
        .eq('job_type_id', selectedTypeId)
        .order('sort_order');
      if (error) throw error;
      return data as JobStage[];
    },
    enabled: !!selectedTypeId
  });

  const saveTypeMutation = useMutation({
    mutationFn: async (typeData: Partial<JobType>) => {
      if (editingType?.id) {
        const { error } = await supabase
          .from('crm_job_types')
          .update(typeData)
          .eq('id', editingType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_job_types')
          .insert(typeData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job_types'] });
      setIsTypeDialogOpen(false);
      setEditingType(null);
      toast.success(editingType ? 'Job type updated' : 'Job type created');
    },
    onError: (error) => toast.error('Failed to save job type: ' + error.message)
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_job_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job_types'] });
      if (selectedTypeId) setSelectedTypeId(null);
      toast.success('Job type deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message)
  });

  const saveStageMutation = useMutation({
    mutationFn: async (stageData: Partial<JobStage>) => {
      if (editingStage?.id) {
        const { error } = await supabase
          .from('crm_job_stages')
          .update(stageData)
          .eq('id', editingStage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_job_stages')
          .insert({ ...stageData, job_type_id: selectedTypeId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job_stages'] });
      setIsStageDialogOpen(false);
      setEditingStage(null);
      toast.success(editingStage ? 'Stage updated' : 'Stage created');
    },
    onError: (error) => toast.error('Failed to save stage: ' + error.message)
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_job_stages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job_stages'] });
      toast.success('Stage deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message)
  });

  const updateStagesOrderMutation = useMutation({
    mutationFn: async (updatedStages: { id: string; sort_order: number }[]) => {
      const updates = updatedStages.map(stage =>
        supabase
          .from('crm_job_stages')
          .update({ sort_order: stage.sort_order })
          .eq('id', stage.id)
      );
      const results = await Promise.all(updates);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job_stages'] });
      toast.success('Stage order updated');
    },
    onError: (error) => toast.error('Failed to reorder: ' + error.message)
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex(s => s.id === active.id);
      const newIndex = stages.findIndex(s => s.id === over.id);
      const reordered = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({
        id: s.id,
        sort_order: i + 1
      }));
      updateStagesOrderMutation.mutate(reordered);
    }
  };

  const residentialTypes = jobTypes.filter(t => t.category === 'residential');
  const commercialTypes = jobTypes.filter(t => t.category === 'commercial');
  const selectedType = jobTypes.find(t => t.id === selectedTypeId);

  return (
    <AdminLayout title="Job Types & Stages">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Job Types & Stages</h1>
            <p className="text-muted-foreground">Configure job categories and their workflow stages</p>
          </div>
          <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingType(null)}>
                <Plus className="h-4 w-4 mr-2" /> New Job Type
              </Button>
            </DialogTrigger>
            <JobTypeDialog
              editingType={editingType}
              onSave={(data) => saveTypeMutation.mutate(data)}
              isLoading={saveTypeMutation.isPending}
            />
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Types List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Job Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {typesLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Residential</h4>
                    {residentialTypes.map(type => (
                      <JobTypeItem
                        key={type.id}
                        type={type}
                        isSelected={selectedTypeId === type.id}
                        onClick={() => setSelectedTypeId(type.id)}
                        onEdit={() => { setEditingType(type); setIsTypeDialogOpen(true); }}
                        onDelete={() => deleteTypeMutation.mutate(type.id)}
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Commercial</h4>
                    {commercialTypes.map(type => (
                      <JobTypeItem
                        key={type.id}
                        type={type}
                        isSelected={selectedTypeId === type.id}
                        onClick={() => setSelectedTypeId(type.id)}
                        onEdit={() => { setEditingType(type); setIsTypeDialogOpen(true); }}
                        onDelete={() => deleteTypeMutation.mutate(type.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stages for Selected Type */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedType ? `Stages for: ${selectedType.name}` : 'Select a Job Type'}
              </CardTitle>
              {selectedType && (
                <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setEditingStage(null)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Stage
                    </Button>
                  </DialogTrigger>
                  <StageDialog
                    editingStage={editingStage}
                    nextSortOrder={stages.length + 1}
                    onSave={(data) => saveStageMutation.mutate(data)}
                    isLoading={saveStageMutation.isPending}
                  />
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {!selectedType ? (
                <p className="text-muted-foreground text-center py-8">
                  Select a job type from the left to view and manage its workflow stages
                </p>
              ) : stagesLoading ? (
                <p className="text-muted-foreground">Loading stages...</p>
              ) : stages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No stages configured. Add stages to define the workflow.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={stages.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {stages.map((stage, index) => (
                        <SortableStageRow
                          key={stage.id}
                          stage={stage}
                          index={index}
                          onEdit={() => { setEditingStage(stage); setIsStageDialogOpen(true); }}
                          onDelete={() => deleteStageMutation.mutate(stage.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

interface JobTypeItemProps {
  type: JobType;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const JobTypeItem = React.forwardRef<HTMLDivElement, JobTypeItemProps>(
  ({ type, isSelected, onClick, onEdit, onDelete }, ref) => {
    const Icon = iconMap[type.icon_name] || Wrench;
    
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
          isSelected ? "bg-primary/10 border-primary" : "hover:bg-accent"
        )}
        onClick={onClick}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: type.color + '20' }}
        >
          <Icon className="h-4 w-4" style={{ color: type.color }} />
        </div>
        <span className="flex-1 font-medium">{type.name}</span>
        {!type.is_active && <Badge variant="outline">Inactive</Badge>}
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }
);
JobTypeItem.displayName = 'JobTypeItem';

function JobTypeDialog({ 
  editingType, 
  onSave, 
  isLoading 
}: { 
  editingType: JobType | null; 
  onSave: (data: Partial<JobType>) => void;
  isLoading: boolean;
}) {
  const defaultFormData = {
    category: 'residential',
    name: '',
    slug: '',
    default_duration_hours: 2,
    default_priority: 'normal',
    requires_permit: false,
    icon_name: 'Wrench',
    color: '#3B82F6',
    is_active: true
  };
  
  const [formData, setFormData] = useState<Partial<JobType>>(editingType || defaultFormData);

  // Reset form when editingType changes
  useEffect(() => {
    setFormData(editingType || defaultFormData);
  }, [editingType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editingType ? 'Edit Job Type' : 'New Job Type'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                name: e.target.value,
                slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
              })}
              placeholder="e.g., Service Call"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Duration (hours)</Label>
            <Input
              type="number"
              step="0.5"
              value={formData.default_duration_hours || 2}
              onChange={(e) => setFormData({ ...formData, default_duration_hours: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Priority</Label>
            <Select
              value={formData.default_priority}
              onValueChange={(v) => setFormData({ ...formData, default_priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Color</Label>
            <Input
              type="color"
              value={formData.color || '#3B82F6'}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <Select
              value={formData.icon_name}
              onValueChange={(v) => setFormData({ ...formData, icon_name: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wrench">Wrench</SelectItem>
                <SelectItem value="Package">Package</SelectItem>
                <SelectItem value="ClipboardCheck">Clipboard</SelectItem>
                <SelectItem value="Settings">Settings</SelectItem>
                <SelectItem value="Home">Home</SelectItem>
                <SelectItem value="Building">Building</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.requires_permit}
              onCheckedChange={(v) => setFormData({ ...formData, requires_permit: v })}
            />
            <Label>Requires Permit</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
            />
            <Label>Active</Label>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Job Type'}
        </Button>
      </form>
    </DialogContent>
  );
}

function StageDialog({ 
  editingStage, 
  nextSortOrder,
  onSave, 
  isLoading 
}: { 
  editingStage: JobStage | null; 
  nextSortOrder: number;
  onSave: (data: Partial<JobStage>) => void;
  isLoading: boolean;
}) {
  const getDefaultFormData = () => ({
    name: '',
    stage_type: 'in_progress',
    color: '#3B82F6',
    sort_order: nextSortOrder,
    auto_notify_customer: false,
    is_active: true
  });
  
  const [formData, setFormData] = useState<Partial<JobStage>>(editingStage || getDefaultFormData());

  // Reset form when editingStage changes
  useEffect(() => {
    setFormData(editingStage || getDefaultFormData());
  }, [editingStage, nextSortOrder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editingStage ? 'Edit Stage' : 'New Stage'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Stage Name</Label>
          <Input
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., In Progress"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Stage Type</Label>
            <Select
              value={formData.stage_type}
              onValueChange={(v) => setFormData({ ...formData, stage_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="initial">Initial</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <Input
              type="color"
              value={formData.color || '#3B82F6'}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Sort Order</Label>
          <Input
            type="number"
            value={formData.sort_order || 1}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.auto_notify_customer}
              onCheckedChange={(v) => setFormData({ ...formData, auto_notify_customer: v })}
            />
            <Label>Auto-notify Customer</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
            />
            <Label>Active</Label>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Stage'}
        </Button>
      </form>
    </DialogContent>
  );
}
