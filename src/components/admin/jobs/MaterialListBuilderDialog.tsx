import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Minus, Plus, Trash2, Package, Send, Lock } from 'lucide-react';
import MaterialCatalogPicker, { type CatalogMaterial } from './MaterialCatalogPicker';
import { cn } from '@/lib/utils';

type Status = 'draft' | 'submitted' | 'reviewed' | 'fulfilled' | 'cancelled';

interface MaterialRequest {
  id: string;
  list_name: string | null;
  status: Status;
  requested_by: string;
  job_id: string | null;
  source_estimate_id: string | null;
}

interface ListItem {
  id: string;
  request_id: string;
  material_id: string | null;
  custom_item: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  from_takeoff: boolean;
  sort_order: number;
  material?: {
    id: string;
    name: string;
    name_es: string | null;
    image_url: string | null;
    unit: string;
  } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  currentUserId: string;
  isAdminOrManager: boolean;
}

const statusBadge = (s: Status) => {
  const map: Record<Status, string> = {
    draft: 'bg-muted text-foreground',
    submitted: 'bg-[#d4a84b] text-[#1e3a5f]',
    reviewed: 'bg-blue-100 text-blue-800',
    fulfilled: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return map[s];
};

export default function MaterialListBuilderDialog({
  open,
  onOpenChange,
  requestId,
  currentUserId,
  isAdminOrManager,
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [nameDraft, setNameDraft] = useState('');

  const { data: request, isLoading: loadingReq } = useQuery({
    queryKey: ['material_request', requestId],
    enabled: open && !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_requests')
        .select('id, list_name, status, requested_by, job_id, source_estimate_id')
        .eq('id', requestId)
        .single();
      if (error) throw error;
      return data as MaterialRequest;
    },
  });

  useEffect(() => {
    if (request) setNameDraft(request.list_name || '');
  }, [request?.id]);

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['material_request_items', requestId],
    enabled: open && !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_request_items')
        .select('id, request_id, material_id, custom_item, quantity, unit, notes, from_takeoff, sort_order, material:materials_catalog(id, name, name_es, image_url, unit)')
        .eq('request_id', requestId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ListItem[];
    },
  });

  const canEdit = useMemo(() => {
    if (!request) return false;
    if (isAdminOrManager) return true;
    if (request.requested_by !== currentUserId) return false;
    return request.status === 'draft' || request.status === 'submitted';
  }, [request, isAdminOrManager, currentUserId]);

  const addedCounts = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((i) => {
      if (i.material_id) m[i.material_id] = (m[i.material_id] || 0) + Number(i.quantity || 0);
    });
    return m;
  }, [items]);

  const addOrIncrementMutation = useMutation({
    mutationFn: async (mat: CatalogMaterial) => {
      const existing = items.find((i) => i.material_id === mat.id);
      if (existing) {
        const { error } = await supabase
          .from('material_request_items')
          .update({ quantity: Number(existing.quantity) + 1 })
          .eq('id', existing.id);
        if (error) throw error;
        return;
      }
      const nextSort = (items[items.length - 1]?.sort_order ?? -1) + 1;
      const { error } = await supabase.from('material_request_items').insert({
        request_id: requestId,
        material_id: mat.id,
        quantity: 1,
        unit: mat.unit,
        from_takeoff: false,
        sort_order: nextSort,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['material_request_items', requestId] }),
    onError: (e: any) => toast({ title: 'Could not add', description: e.message, variant: 'destructive' }),
  });

  const updateItemMutation = useMutation({
    mutationFn: async (patch: Partial<ListItem> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from('material_request_items').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['material_request_items', requestId] }),
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('material_request_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['material_request_items', requestId] }),
  });

  const addCustomMutation = useMutation({
    mutationFn: async (payload: { name: string; quantity: number; unit: string }) => {
      const nextSort = (items[items.length - 1]?.sort_order ?? -1) + 1;
      const { error } = await supabase.from('material_request_items').insert({
        request_id: requestId,
        material_id: null,
        custom_item: payload.name,
        quantity: payload.quantity,
        unit: payload.unit,
        from_takeoff: false,
        sort_order: nextSort,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['material_request_items', requestId] }),
  });

  const renameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('material_requests')
        .update({ list_name: name || null }).eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material_request', requestId] });
      qc.invalidateQueries({ queryKey: ['material_requests_for_job'] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('material_requests')
        .update({ status: 'submitted' }).eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'List submitted for review' });
      qc.invalidateQueries({ queryKey: ['material_request', requestId] });
      qc.invalidateQueries({ queryKey: ['material_requests_for_job'] });
    },
    onError: (e: any) => toast({ title: 'Submit failed', description: e.message, variant: 'destructive' }),
  });

  // Custom item form
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customUnit, setCustomUnit] = useState('ea');

  const displayName = (i: ListItem) =>
    i.material
      ? (language === 'es' ? (i.material.name_es || i.material.name) : i.material.name)
      : (i.custom_item || 'Item');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[96vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {canEdit ? (
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => {
                  if ((request?.list_name || '') !== nameDraft) renameMutation.mutate(nameDraft);
                }}
                placeholder="List name"
                className="h-9 w-64 text-base font-semibold"
              />
            ) : (
              <span>{request?.list_name || 'Untitled list'}</span>
            )}
            {request && (
              <Badge className={cn('capitalize', statusBadge(request.status))}>
                {request.status}
              </Badge>
            )}
            {!canEdit && (
              <span className="inline-flex items-center text-xs text-muted-foreground">
                <Lock className="h-3 w-3 mr-1" /> Read-only
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {(loadingReq || loadingItems) ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current items */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Items ({items.length})
              </h3>
              {items.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
                  No items yet. Add from the catalog below.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center gap-3 border rounded-lg p-2 bg-card"
                    >
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {i.material?.image_url ? (
                          <img src={i.material.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight truncate flex items-center gap-2">
                          {displayName(i)}
                          {i.from_takeoff && (
                            <Badge variant="outline" className="text-[10px] py-0">takeoff</Badge>
                          )}
                          {!i.material_id && (
                            <Badge variant="outline" className="text-[10px] py-0">custom</Badge>
                          )}
                        </div>
                        <input
                          disabled={!canEdit}
                          value={i.notes || ''}
                          onChange={(e) => updateItemMutation.mutate({ id: i.id, notes: e.target.value })}
                          placeholder="Notes (optional)"
                          className="mt-1 w-full text-xs bg-transparent border-b border-transparent focus:border-foreground/30 outline-none py-0.5 disabled:opacity-60"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button" size="icon" variant="outline" className="h-9 w-9"
                          disabled={!canEdit || Number(i.quantity) <= 1}
                          onClick={() => updateItemMutation.mutate({ id: i.id, quantity: Math.max(1, Number(i.quantity) - 1) })}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <input
                          disabled={!canEdit}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={i.quantity}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v >= 0) updateItemMutation.mutate({ id: i.id, quantity: v });
                          }}
                          className="w-14 h-9 text-center border rounded-md bg-background disabled:opacity-60"
                        />
                        <Button
                          type="button" size="icon" variant="outline" className="h-9 w-9"
                          disabled={!canEdit}
                          onClick={() => updateItemMutation.mutate({ id: i.id, quantity: Number(i.quantity) + 1 })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground w-10 text-center">{i.unit || '—'}</span>
                        <Button
                          type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive"
                          disabled={!canEdit}
                          onClick={() => {
                            if (confirm('Remove this item?')) deleteItemMutation.mutate(i.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom item */}
            {canEdit && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <h3 className="text-sm font-semibold">Add custom item</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Item name"
                    className="flex-1 h-10"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="unit"
                    className="w-20 h-10"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const q = parseFloat(customQty);
                      if (!customName.trim() || isNaN(q) || q <= 0) return;
                      addCustomMutation.mutate({ name: customName.trim(), quantity: q, unit: customUnit.trim() || 'ea' });
                      setCustomName(''); setCustomQty('1'); setCustomUnit('ea');
                    }}
                    style={{ backgroundColor: '#1e3a5f', color: 'white' }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            )}

            {/* Catalog picker */}
            {canEdit && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Catalog</h3>
                <MaterialCatalogPicker
                  language={language}
                  onLanguageChange={setLanguage}
                  onPick={(m) => addOrIncrementMutation.mutate(m)}
                  addedCounts={addedCounts}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
          <div className="text-xs text-muted-foreground">
            {request?.status === 'draft' && 'Draft — not yet submitted.'}
            {request?.status === 'submitted' && 'Submitted — pending review.'}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Close
            </Button>
            {request?.status === 'draft' && canEdit && items.length > 0 && (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                style={{ backgroundColor: '#d4a84b', color: '#1e3a5f' }}
                className="flex-1 sm:flex-none font-semibold"
              >
                {submitMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Submit for review
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
