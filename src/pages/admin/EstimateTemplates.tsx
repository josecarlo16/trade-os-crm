import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, LayoutTemplate, GripVertical, Copy, Settings } from 'lucide-react';

type JobType = 'residential_new' | 'residential_replacement' | 'commercial_new' | 'commercial_replacement' | 'maintenance' | 'repair';
type HeatingType = 'gas' | 'electric' | 'heat_pump' | 'dual_fuel';

interface Template {
  id: string;
  name: string;
  description: string | null;
  job_type: JobType;
  heating_type: HeatingType;
  profit_margin: number;
  is_active: boolean;
  sort_order: number;
}

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'residential_new', label: 'Residential - New' },
  { value: 'residential_replacement', label: 'Residential - Replacement' },
  { value: 'commercial_new', label: 'Commercial - New' },
  { value: 'commercial_replacement', label: 'Commercial - Replacement' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
];

const HEATING_TYPES: { value: HeatingType; label: string }[] = [
  { value: 'gas', label: 'Gas Furnace' },
  { value: 'electric', label: 'Electric' },
  { value: 'heat_pump', label: 'Heat Pump' },
  { value: 'dual_fuel', label: 'Dual Fuel' },
];

const EstimateTemplates = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    job_type: 'residential_replacement' as JobType,
    heating_type: 'gas' as HeatingType,
    profit_margin: 1.60,
    is_active: true,
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['estimate-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimate_templates')
        .select('*')
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return data as Template[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('estimate_templates')
          .update({
            name: data.name,
            description: data.description || null,
            job_type: data.job_type,
            heating_type: data.heating_type,
            profit_margin: data.profit_margin,
            is_active: data.is_active,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const maxOrder = templates.length > 0 ? Math.max(...templates.map(t => t.sort_order)) + 1 : 0;
        const { error } = await supabase
          .from('estimate_templates')
          .insert({
            name: data.name,
            description: data.description || null,
            job_type: data.job_type,
            heating_type: data.heating_type,
            profit_margin: data.profit_margin,
            is_active: data.is_active,
            sort_order: maxOrder,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates'] });
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('estimate_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates'] });
      toast.success('Template deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });

  // Clone mutation
  const cloneMutation = useMutation({
    mutationFn: async (template: Template) => {
      // Clone the template
      const { data: newTemplate, error: templateError } = await supabase
        .from('estimate_templates')
        .insert({
          name: template.name + ' (Copy)',
          description: template.description,
          job_type: template.job_type,
          heating_type: template.heating_type,
          profit_margin: template.profit_margin,
          is_active: false,
          sort_order: templates.length,
        })
        .select()
        .single();
      
      if (templateError) throw templateError;

      // Clone template items
      const { data: items, error: itemsError } = await supabase
        .from('estimate_template_items')
        .select('*')
        .eq('template_id', template.id);
      
      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const newItems = items.map(item => ({
          template_id: newTemplate.id,
          item_type: item.item_type,
          name: item.name,
          description: item.description,
          material_id: item.material_id,
          labor_rate_id: item.labor_rate_id,
          admin_cost_id: item.admin_cost_id,
          equipment_system_id: item.equipment_system_id,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          sort_order: item.sort_order,
        }));

        const { error: insertError } = await supabase
          .from('estimate_template_items')
          .insert(newItems);
        
        if (insertError) throw insertError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates'] });
      toast.success('Template cloned');
    },
    onError: (error) => {
      toast.error('Failed to clone template: ' + error.message);
    },
  });

  const handleOpenDialog = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        job_type: template.job_type,
        heating_type: template.heating_type,
        profit_margin: Number(template.profit_margin),
        is_active: template.is_active,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        job_type: 'residential_replacement',
        heating_type: 'gas',
        profit_margin: 1.60,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    saveMutation.mutate({ ...formData, id: editingTemplate?.id });
  };

  const handleDelete = (template: Template) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  return (
    <AdminLayout title="Estimate Templates">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutTemplate className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Estimate Templates</h1>
              <p className="text-muted-foreground">Pre-configured templates for common job types</p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Templates ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No templates yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Job Type</TableHead>
                      <TableHead>Heating</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-muted-foreground">{template.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {JOB_TYPES.find(t => t.value === template.job_type)?.label || template.job_type}
                        </TableCell>
                        <TableCell>
                          {HEATING_TYPES.find(t => t.value === template.heating_type)?.label || template.heating_type}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {((Number(template.profit_margin) - 1) * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {template.is_active ? 'Yes' : 'No'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/admin/estimate-templates/${template.id}/edit`)}
                              title="Edit Items"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(template)}
                              title="Settings"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => cloneMutation.mutate(template)}
                              disabled={cloneMutation.isPending}
                              title="Clone"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(template)}
                              className="text-destructive hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Attic Install - Gas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_type">Job Type</Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(v) => setFormData({ ...formData, job_type: v as JobType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="heating_type">Heating Type</Label>
                <Select
                  value={formData.heating_type}
                  onValueChange={(v) => setFormData({ ...formData, heating_type: v as HeatingType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HEATING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profit_margin">Default Profit Margin (%)</Label>
              <Input
                id="profit_margin"
                type="number"
                step="0.05"
                min="1"
                max="3"
                value={formData.profit_margin}
                onChange={(e) => setFormData({ ...formData, profit_margin: parseFloat(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground">
                Enter as multiplier (e.g., 1.60 = 60% margin)
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default EstimateTemplates;
