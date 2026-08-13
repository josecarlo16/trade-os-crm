import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Receipt, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type AdminCostType = 'fixed' | 'percentage' | 'per_job';

interface AdminCost {
  id: string;
  name: string;
  cost_type: AdminCostType;
  amount: number;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const COST_TYPES: { value: AdminCostType; label: string; description: string }[] = [
  { value: 'fixed', label: 'Fixed Amount', description: 'A set dollar amount per job' },
  { value: 'percentage', label: 'Percentage', description: 'Percentage of job total' },
  { value: 'per_job', label: 'Per Job', description: 'Applied once per job' },
];

const AdminCosts = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<AdminCost | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cost_type: 'fixed' as AdminCostType,
    amount: '',
    description: '',
    is_required: false,
    is_active: true,
  });

  // Fetch admin costs
  const { data: adminCosts = [], isLoading } = useQuery({
    queryKey: ['admin-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_costs')
        .select('*')
        .order('is_required', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return data as AdminCost[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<AdminCost, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('admin_costs')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-costs'] });
      toast.success('Admin cost added successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to add admin cost: ' + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AdminCost> & { id: string }) => {
      const { error } = await supabase
        .from('admin_costs')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-costs'] });
      toast.success('Admin cost updated successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to update admin cost: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_costs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-costs'] });
      toast.success('Admin cost deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete admin cost: ' + error.message);
    },
  });

  const handleOpenDialog = (cost?: AdminCost) => {
    if (cost) {
      setEditingCost(cost);
      setFormData({
        name: cost.name,
        cost_type: cost.cost_type,
        amount: cost.amount.toString(),
        description: cost.description || '',
        is_required: cost.is_required,
        is_active: cost.is_active,
      });
    } else {
      setEditingCost(null);
      setFormData({
        name: '',
        cost_type: 'fixed',
        amount: '',
        description: '',
        is_required: false,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCost(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      cost_type: formData.cost_type,
      amount: parseFloat(formData.amount) || 0,
      description: formData.description || null,
      is_required: formData.is_required,
      is_active: formData.is_active,
    };

    if (editingCost) {
      updateMutation.mutate({ id: editingCost.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatAmount = (amount: number, type: AdminCostType) => {
    if (type === 'percentage') {
      return `${amount}%`;
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCostTypeLabel = (type: AdminCostType) => {
    return COST_TYPES.find(t => t.value === type)?.label || type;
  };

  const requiredCosts = adminCosts.filter(c => c.is_required);
  const optionalCosts = adminCosts.filter(c => !c.is_required);

  const CostTable = ({ costs, title }: { costs: AdminCost[]; title: string }) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No {title.toLowerCase()} configured.
                </TableCell>
              </TableRow>
            ) : (
              costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {cost.name}
                      {cost.is_required && (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {getCostTypeLabel(cost.cost_type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-lg">
                    {formatAmount(cost.amount, cost.cost_type)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {cost.description || '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      cost.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {cost.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(cost.updated_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(cost)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cost.id, cost.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <AdminLayout title="Admin Costs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Costs</h1>
              <p className="text-muted-foreground">Manage overhead costs for estimates (insurance, permits, etc.)</p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Admin Cost
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : adminCosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No admin costs configured. Click "Add Admin Cost" to get started.
          </div>
        ) : (
          <div className="space-y-8">
            <CostTable costs={requiredCosts} title="Required Costs" />
            <CostTable costs={optionalCosts} title="Optional Costs" />
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>
                {editingCost ? 'Edit Admin Cost' : 'Add New Admin Cost'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., General Liability Insurance"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost_type">Cost Type *</Label>
                    <Select
                      value={formData.cost_type}
                      onValueChange={(v) => setFormData({ ...formData, cost_type: v as AdminCostType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COST_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      {formData.cost_type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'} *
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step={formData.cost_type === 'percentage' ? '0.1' : '0.01'}
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder={formData.cost_type === 'percentage' ? '5.0' : '0.00'}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_required">Required</Label>
                    <p className="text-xs text-muted-foreground">Auto-included in all estimates</p>
                  </div>
                  <Switch
                    id="is_required"
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                  />
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
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? 'Saving...' 
                    : editingCost ? 'Save Changes' : 'Add Cost'
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCosts;
