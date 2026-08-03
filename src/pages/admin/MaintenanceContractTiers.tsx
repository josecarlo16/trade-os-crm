import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export interface ContractTier {
  id: string;
  name: string;
  segment: 'residential' | 'commercial' | 'both';
  base_price: number | null;
  additional_unit_price: number | null;
  per_visit_price: number | null;
  visits_per_year: number;
  filter_interval_days: number;
  inclusions_text: string | null;
  is_active: boolean;
  sort_order: number;
}

const EMPTY: Omit<ContractTier, 'id'> = {
  name: '',
  segment: 'residential',
  base_price: 0,
  additional_unit_price: 0,
  per_visit_price: null,
  visits_per_year: 2,
  filter_interval_days: 90,
  inclusions_text: '',
  is_active: true,
  sort_order: 0,
};

export function useContractTiers(includeInactive = false) {
  return useQuery({
    queryKey: ['contract_tiers', includeInactive],
    queryFn: async () => {
      let q = supabase.from('crm_contract_tiers' as any).select('*').order('sort_order', { ascending: true });
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ContractTier[];
    },
  });
}

export default function MaintenanceContractTiers() {
  const [tab, setTab] = useState<'residential' | 'commercial' | 'inactive'>('residential');
  const { data: tiers = [], isLoading } = useContractTiers(true);
  const [editing, setEditing] = useState<Partial<ContractTier> | null>(null);

  const filtered = tiers.filter((t) => {
    if (tab === 'inactive') return !t.is_active;
    if (!t.is_active) return false;
    if (tab === 'residential') return t.segment === 'residential' || t.segment === 'both';
    return t.segment === 'commercial' || t.segment === 'both';
  });

  return (
    <AdminLayout title="Contract Tiers & Pricing">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/contracts"><ArrowLeft className="w-4 h-4" /> Back to Contracts</Link>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Contract Tiers & Pricing</h1>
            <p className="text-sm text-muted-foreground">Reusable pricing presets applied when creating contracts.</p>
          </div>
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="w-4 h-4" /> New Tier
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="residential">Residential</TabsTrigger>
            <TabsTrigger value="commercial">Commercial</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            {isLoading && <p className="text-muted-foreground">Loading…</p>}
            {!isLoading && filtered.length === 0 && (
              <Card><CardContent className="p-6 text-muted-foreground">No tiers in this category.</CardContent></Card>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                      <Badge variant="outline" className="capitalize">{t.segment}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Base price</span><span className="font-medium">${Number(t.base_price ?? 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Each addl unit</span><span>${Number(t.additional_unit_price ?? 0).toFixed(2)}</span></div>
                    {t.per_visit_price != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Per visit</span><span>${Number(t.per_visit_price).toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Visits / yr</span><span>{t.visits_per_year}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Filter interval</span><span>{t.filter_interval_days}d</span></div>
                    {t.inclusions_text && (
                      <p className="text-xs text-muted-foreground line-clamp-3 pt-1">{t.inclusions_text}</p>
                    )}
                    <div className="pt-2 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                        <Pencil className="w-4 h-4" /> Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {editing && (
          <TierDialog tier={editing} onClose={() => setEditing(null)} />
        )}
      </div>
    </AdminLayout>
  );
}

function TierDialog({ tier, onClose }: { tier: Partial<ContractTier>; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<ContractTier>>(tier);
  const isNew = !tier.id;

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        segment: form.segment,
        base_price: form.base_price ?? 0,
        additional_unit_price: form.additional_unit_price ?? 0,
        per_visit_price: form.per_visit_price,
        visits_per_year: form.visits_per_year ?? 2,
        filter_interval_days: form.filter_interval_days ?? 90,
        inclusions_text: form.inclusions_text || null,
        is_active: form.is_active ?? true,
        sort_order: form.sort_order ?? 0,
      };
      if (isNew) {
        const { error } = await supabase.from('crm_contract_tiers' as any).insert(payload as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_contract_tiers' as any).update(payload as any).eq('id', tier.id!);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contract_tiers'] });
      toast.success(isNew ? 'Tier created' : 'Tier updated');
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Save failed'),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? 'New Tier' : `Edit ${tier.name}`}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Segment</Label>
              <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Base Price</Label>
              <Input type="number" step="0.01" value={form.base_price ?? 0}
                onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Additional Unit Price</Label>
              <Input type="number" step="0.01" value={form.additional_unit_price ?? 0}
                onChange={(e) => setForm({ ...form, additional_unit_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Per-Visit Price</Label>
              <Input type="number" step="0.01" value={form.per_visit_price ?? ''}
                onChange={(e) => setForm({ ...form, per_visit_price: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Visits / Year</Label>
              <Input type="number" min={1} value={form.visits_per_year ?? 2}
                onChange={(e) => setForm({ ...form, visits_per_year: Number(e.target.value) || 1 })} />
            </div>
            <div>
              <Label>Filter Interval (days)</Label>
              <Input type="number" min={1} value={form.filter_interval_days ?? 90}
                onChange={(e) => setForm({ ...form, filter_interval_days: Number(e.target.value) || 90 })} />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order ?? 0}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <Label>Inclusions (markdown supported)</Label>
            <Textarea rows={5} value={form.inclusions_text ?? ''}
              onChange={(e) => setForm({ ...form, inclusions_text: e.target.value })}
              placeholder="Spring + Fall tune-ups, priority scheduling, 15% discount on repairs" />
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <Label className="m-0">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive tiers are hidden from new contract creation.</p>
            </div>
            <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
            {save.isPending ? 'Saving…' : 'Save Tier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
