import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Package, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerEquipmentTabProps {
  customerId: string;
  locations: Array<{ id: string; address_line1: string; city: string }>;
}

const EQUIPMENT_TYPES = [
  { value: 'hvac', label: 'HVAC System' },
  { value: 'furnace', label: 'Furnace' },
  { value: 'heat_pump', label: 'Heat Pump' },
  { value: 'mini_split', label: 'Mini Split' },
  { value: 'water_heater', label: 'Water Heater' },
  { value: 'air_handler', label: 'Air Handler' },
  { value: 'condenser', label: 'Condenser' },
  { value: 'thermostat', label: 'Thermostat' },
];

const defaultForm = {
  location_id: '',
  equipment_type: 'hvac',
  brand: '',
  model_number: '',
  serial_number: '',
  tonnage: '',
  seer_rating: '',
  refrigerant_type: '',
  install_date: '',
  estimated_age: '',
  condition_rating: '',
  warranty_expiration: '',
  location_description: '',
  zone_served: '',
  notes: '',
  is_active: true,
  replacement_recommended: false,
  replacement_priority: '',
  replacement_notes: '',
};

export const CustomerEquipmentTab = ({ customerId, locations }: CustomerEquipmentTabProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['crm_location_equipment', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_location_equipment')
        .select('*, crm_locations!location_id(address_line1, city)')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm, location_id: locations[0]?.id || '' });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      location_id: item.location_id || '',
      equipment_type: item.equipment_type || 'hvac',
      brand: item.brand || '',
      model_number: item.model_number || '',
      serial_number: item.serial_number || '',
      tonnage: item.tonnage?.toString() || '',
      seer_rating: item.seer_rating?.toString() || '',
      refrigerant_type: item.refrigerant_type || '',
      install_date: item.install_date || '',
      estimated_age: item.estimated_age?.toString() || '',
      condition_rating: item.condition_rating?.toString() || '',
      warranty_expiration: item.warranty_expiration || '',
      location_description: item.location_description || '',
      zone_served: item.zone_served || '',
      notes: item.notes || '',
      is_active: item.is_active,
      replacement_recommended: item.replacement_recommended,
      replacement_priority: item.replacement_priority || '',
      replacement_notes: item.replacement_notes || '',
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customer_id: customerId,
        location_id: form.location_id || null,
        equipment_type: form.equipment_type,
        brand: form.brand || null,
        model_number: form.model_number || null,
        serial_number: form.serial_number || null,
        tonnage: form.tonnage ? parseFloat(form.tonnage) : null,
        seer_rating: form.seer_rating ? parseFloat(form.seer_rating) : null,
        refrigerant_type: form.refrigerant_type || null,
        install_date: form.install_date || null,
        estimated_age: form.estimated_age ? parseInt(form.estimated_age) : null,
        condition_rating: form.condition_rating ? parseInt(form.condition_rating) : null,
        warranty_expiration: form.warranty_expiration || null,
        location_description: form.location_description || null,
        zone_served: form.zone_served || null,
        notes: form.notes || null,
        is_active: form.is_active,
        replacement_recommended: form.replacement_recommended,
        replacement_priority: form.replacement_priority || null,
        replacement_notes: form.replacement_notes || null,
      };

      if (editingId) {
        const { error } = await supabase.from('crm_location_equipment').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_location_equipment').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_location_equipment', customerId] });
      toast.success(editingId ? 'Equipment updated' : 'Equipment added');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_location_equipment').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_location_equipment', customerId] });
      toast.success('Equipment removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Equipment
          </Button>
        </div>

        {equipment.length > 0 ? (
          equipment.map((item: any) => {
            const loc = item.crm_locations;
            return (
              <Card key={item.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {item.brand || 'Unknown'} {item.model_number || ''}
                        {item.tonnage && ` — ${item.tonnage}T`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {EQUIPMENT_TYPES.find(t => t.value === item.equipment_type)?.label || item.equipment_type}
                        {loc && ` • ${loc.address_line1}, ${loc.city}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.replacement_recommended && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" /> Replace
                      </Badge>
                    )}
                    {!item.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center py-8">
                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No equipment records</p>
                <p className="text-xs text-muted-foreground mt-1">Add equipment to track installed systems</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Equipment Type *</Label>
                <Select value={form.equipment_type} onValueChange={v => set('equipment_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {locations.length > 0 && (
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={form.location_id} onValueChange={v => set('location_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.address_line1}, {l.city}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Trane" />
              </div>
              <div className="space-y-2">
                <Label>Model #</Label>
                <Input value={form.model_number} onChange={e => set('model_number', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Serial #</Label>
                <Input value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tonnage</Label>
                <Input type="number" step="0.5" value={form.tonnage} onChange={e => set('tonnage', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>SEER Rating</Label>
                <Input type="number" step="0.1" value={form.seer_rating} onChange={e => set('seer_rating', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Refrigerant</Label>
                <Input value={form.refrigerant_type} onChange={e => set('refrigerant_type', e.target.value)} placeholder="e.g. R-410A" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Install Date</Label>
                <Input type="date" value={form.install_date} onChange={e => set('install_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Est. Age (years)</Label>
                <Input type="number" value={form.estimated_age} onChange={e => set('estimated_age', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Warranty Expires</Label>
                <Input type="date" value={form.warranty_expiration} onChange={e => set('warranty_expiration', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Zone Served</Label>
                <Input value={form.zone_served} onChange={e => set('zone_served', e.target.value)} placeholder="e.g. Upstairs, Main Floor" />
              </div>
              <div className="space-y-2">
                <Label>Condition (1-10)</Label>
                <Input type="number" min="1" max="10" value={form.condition_rating} onChange={e => set('condition_rating', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.replacement_recommended} onCheckedChange={v => set('replacement_recommended', v)} />
                <Label>Replacement Recommended</Label>
              </div>
            </div>

            {form.replacement_recommended && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.replacement_priority} onValueChange={v => set('replacement_priority', v)}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Replacement Notes</Label>
                  <Input value={form.replacement_notes} onChange={e => set('replacement_notes', e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : (editingId ? 'Update' : 'Add Equipment')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
