import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOttoMaterials, useOttoEquipmentCatalog } from '@/hooks/useOttoPay';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ottoPost, ottoDelete } from '@/integrations/ottopay/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Package, Wrench } from 'lucide-react';
import { toast } from 'sonner';
const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

const InvoiceCatalog = () => {
  const { data: materials, isLoading: loadMat } = useOttoMaterials();
  const { data: equipment, isLoading: loadEq } = useOttoEquipmentCatalog();
  const qc = useQueryClient();
  const [createType, setCreateType] = useState<'material' | 'equipment' | null>(null);
  const [form, setForm] = useState({ name: '', description: '', unit_price: '', unit: '', category: '', model_number: '', brand: '' });

  const createMaterial = useMutation({
    mutationFn: async () => {
      const { error } = await ottoPost('catalog', { type: 'materials', name: form.name, description: form.description || null, unit_price: parseFloat(form.unit_price) || 0, unit: form.unit || null, category: form.category || null });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['otto-materials'] }); toast.success('Material added'); setCreateType(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const createEquip = useMutation({
    mutationFn: async () => {
      const { error } = await ottoPost('catalog', { type: 'equipment', name: form.name, description: form.description || null, unit_price: parseFloat(form.unit_price) || 0, model_number: form.model_number || null, brand: form.brand || null, category: form.category || null });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['otto-equipment-catalog'] }); toast.success('Equipment added'); setCreateType(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMat = useMutation({
    mutationFn: async (id: string) => { const { error } = await ottoDelete('catalog', id); if (error) throw new Error(error.message); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['otto-materials'] }); toast.success('Deleted'); },
  });

  const deleteEquip = useMutation({
    mutationFn: async (id: string) => { const { error } = await ottoDelete('catalog', id); if (error) throw new Error(error.message); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['otto-equipment-catalog'] }); toast.success('Deleted'); },
  });

  const resetForm = () => setForm({ name: '', description: '', unit_price: '', unit: '', category: '', model_number: '', brand: '' });

  return (
    <AdminLayout title="Catalog">
      <Tabs defaultValue="materials">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="materials"><Package className="h-4 w-4 mr-1" /> Materials</TabsTrigger>
            <TabsTrigger value="equipment"><Wrench className="h-4 w-4 mr-1" /> Equipment</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { resetForm(); setCreateType('material'); }}><Plus className="h-4 w-4 mr-1" /> Material</Button>
            <Button size="sm" onClick={() => { resetForm(); setCreateType('equipment'); }}><Plus className="h-4 w-4 mr-1" /> Equipment</Button>
          </div>
        </div>

        <TabsContent value="materials">
          <Card><CardContent className="p-0">
            {loadMat ? <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                <TableBody>
                  {(materials || []).map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground">{m.category || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{m.unit || '—'}</TableCell>
                      <TableCell className="text-right">{fmt(m.unit_price)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMat.mutate(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {(materials || []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No materials</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="equipment">
          <Card><CardContent className="p-0">
            {loadEq ? <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Brand</TableHead><TableHead>Model</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                <TableBody>
                  {(equipment || []).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="text-muted-foreground">{e.brand || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{e.model_number || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{e.category || '—'}</TableCell>
                      <TableCell className="text-right">{fmt(e.unit_price)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteEquip.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {(equipment || []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No equipment</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!createType} onOpenChange={open => { if (!open) setCreateType(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New {createType === 'material' ? 'Material' : 'Equipment'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Price</Label><Input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            {createType === 'material' && <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="ea, ft, lb…" /></div>}
            {createType === 'equipment' && (
              <>
                <div><Label>Brand</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
                <div><Label>Model #</Label><Input value={form.model_number} onChange={e => setForm(f => ({ ...f, model_number: e.target.value }))} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateType(null)}>Cancel</Button>
            <Button onClick={() => createType === 'material' ? createMaterial.mutate() : createEquip.mutate()} disabled={!form.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default InvoiceCatalog;
