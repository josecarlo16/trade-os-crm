import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Lock, Unlock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateContract } from '@/hooks/useMaintenanceContracts';
import { useContractTiers, type ContractTier } from '@/pages/admin/MaintenanceContractTiers';
import {
  SEGMENT_DEFAULTS,
  BILLING_OPTIONS,
  type MaintenanceSegment,
  type MaintenanceBillingModel,
} from '@/types/maintenanceContracts';
import { toast } from 'sonner';
import { addDays, toISODate, computeNextFilterDue } from '@/lib/maintenance/dueDateUtils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
  initialCustomerId?: string;
  initialLocationId?: string;
  initialSegment?: MaintenanceSegment;
}

interface FilterRow {
  size: string;
  quantity: number;
  merv_rating?: string;
  interval_days: number;
}

export function NewContractDialog({ open, onOpenChange, onCreated, initialCustomerId, initialLocationId, initialSegment }: Props) {
  const [customerId, setCustomerId] = useState<string>(initialCustomerId ?? '');
  const [locationId, setLocationId] = useState<string>(initialLocationId ?? '');
  const [segment, setSegment] = useState<MaintenanceSegment>(initialSegment ?? 'residential');
  const [tierId, setTierId] = useState<string>('');
  const [unitCount, setUnitCount] = useState(1);
  const [priceLocked, setPriceLocked] = useState(true);
  const [inclusionsLocked, setInclusionsLocked] = useState(true);
  const [inclusionsText, setInclusionsText] = useState('');
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [endDate, setEndDate] = useState(toISODate(addDays(new Date(), 365)));
  const [autoRenew, setAutoRenew] = useState(true);
  const [billingModel, setBillingModel] = useState<MaintenanceBillingModel>('paid_yearly');
  const [contractPrice, setContractPrice] = useState<string>('189');
  const [perVisitPrice, setPerVisitPrice] = useState<string>('');
  const [visitsPerYear, setVisitsPerYear] = useState(2);
  const [filterIntervalDays, setFilterIntervalDays] = useState(90);
  const [notes, setNotes] = useState('');
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const createContract = useCreateContract();
  const { data: allTiers = [] } = useContractTiers(false);

  const availableTiers = useMemo(
    () => allTiers.filter((t) => t.segment === segment || t.segment === 'both'),
    [allTiers, segment],
  );
  const selectedTier: ContractTier | undefined = useMemo(
    () => allTiers.find((t) => t.id === tierId),
    [allTiers, tierId],
  );

  // Apply prefill when dialog opens
  useEffect(() => {
    if (open) {
      if (initialCustomerId !== undefined) setCustomerId(initialCustomerId);
      if (initialLocationId !== undefined) setLocationId(initialLocationId);
      if (initialSegment !== undefined) setSegment(initialSegment);
    }
  }, [open, initialCustomerId, initialLocationId, initialSegment]);

  // Reset tier when segment changes (if current tier no longer matches)
  useEffect(() => {
    if (selectedTier && selectedTier.segment !== 'both' && selectedTier.segment !== segment) {
      setTierId('');
    }
  }, [segment, selectedTier]);

  // Apply segment defaults when no tier selected
  useEffect(() => {
    if (selectedTier) return;
    const def = SEGMENT_DEFAULTS[segment];
    setVisitsPerYear(def.visits_per_year);
    setBillingModel(def.billing_model);
    setContractPrice(def.contract_price?.toString() ?? '');
  }, [segment, selectedTier]);

  // Apply tier defaults when tier selected (or unit count changes)
  useEffect(() => {
    if (!selectedTier) return;
    setVisitsPerYear(selectedTier.visits_per_year);
    setFilterIntervalDays(selectedTier.filter_interval_days);
    setInclusionsText(selectedTier.inclusions_text ?? '');
    setInclusionsLocked(true);
    setPriceLocked(true);
    if (selectedTier.per_visit_price != null && billingModel === 'pay_per_visit') {
      setPerVisitPrice(String(selectedTier.per_visit_price));
    }
  }, [selectedTier?.id]);

  // Auto-calc annual price from tier + unit count whenever locked
  useEffect(() => {
    if (!selectedTier || !priceLocked) return;
    const base = Number(selectedTier.base_price ?? 0);
    const addl = Number(selectedTier.additional_unit_price ?? 0);
    const total = base + addl * Math.max(0, unitCount - 1);
    setContractPrice(total.toFixed(2));
  }, [selectedTier, unitCount, priceLocked]);

  // Auto end date = start + 12 months
  useEffect(() => {
    if (!startDate) return;
    const [y, m, d] = startDate.split('-').map(Number);
    const next = new Date(y, m - 1, d);
    next.setFullYear(next.getFullYear() + 1);
    setEndDate(toISODate(next));
  }, [startDate]);

  const { data: customers = [] } = useQuery({
    queryKey: ['contract_dialog_customers'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('id, first_name, last_name, customer_type')
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['contract_dialog_locations', customerId],
    enabled: open && !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_locations')
        .select('id, address_line1, city, state, zip_code, workedge_property_id')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedLocation = useMemo(
    () => locations.find((l: any) => l.id === locationId),
    [locations, locationId],
  );

  // For residential tier, price is read-only by default. Commercial always editable.
  const residentialLocked = !!selectedTier && segment === 'residential' && priceLocked;
  const inclusionsReadOnly = !!selectedTier && segment === 'residential' && inclusionsLocked;

  function addFilter() {
    setFilters([...filters, { size: '', quantity: 1, interval_days: filterIntervalDays }]);
  }
  function updateFilter(i: number, patch: Partial<FilterRow>) {
    setFilters(filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function removeFilter(i: number) {
    setFilters(filters.filter((_, idx) => idx !== i));
  }

  function reset() {
    setCustomerId('');
    setLocationId('');
    setSegment('residential');
    setTierId('');
    setUnitCount(1);
    setInclusionsText('');
    setNotes('');
    setFilters([]);
  }

  async function handleSubmit() {
    if (!customerId) {
      toast.error('Pick a customer');
      return;
    }
    setSubmitting(true);
    try {
      const today = toISODate(new Date());
      const id = await createContract.mutateAsync({
        contract: {
          customer_id: customerId,
          location_id: locationId || null,
          workedge_property_id: selectedLocation?.workedge_property_id ?? null,
          segment,
          tier: selectedTier?.name ?? null,
          tier_id: selectedTier?.id ?? null,
          tier_name_snapshot: selectedTier?.name ?? null,
          inclusions_text: inclusionsText || null,
          unit_count: unitCount,
          status: 'active',
          start_date: startDate,
          end_date: endDate,
          auto_renew: autoRenew,
          renewal_term_months: 12,
          billing_model: billingModel,
          contract_price: contractPrice ? Number(contractPrice) : null,
          per_visit_price: perVisitPrice ? Number(perVisitPrice) : null,
          visits_per_year: visitsPerYear,
          filter_change_interval_days: filterIntervalDays,
          notes: notes || null,
          next_visit_due: toISODate(addDays(new Date(startDate), 30)),
        } as any,
        filters: filters
          .filter((f) => f.size.trim().length > 0)
          .map((f) => ({
            size: f.size.trim(),
            quantity: f.quantity,
            merv_rating: f.merv_rating || null,
            interval_days: f.interval_days,
            last_changed: today,
            next_due: computeNextFilterDue(today, f.interval_days),
          })),
      });
      toast.success('Contract created');
      reset();
      onOpenChange(false);
      onCreated?.(id);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Maintenance Contract</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Segment */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={segment === 'residential' ? 'default' : 'outline'}
              onClick={() => setSegment('residential')}
            >
              Residential
            </Button>
            <Button
              type="button"
              variant={segment === 'commercial' ? 'default' : 'outline'}
              onClick={() => setSegment('commercial')}
            >
              Commercial
            </Button>
          </div>

          {/* Tier */}
          <div>
            <Label>Tier</Label>
            <Select value={tierId || 'none'} onValueChange={(v) => setTierId(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select a tier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No tier (custom)</SelectItem>
                {availableTiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} — ${Number(t.base_price ?? 0).toFixed(0)}{t.additional_unit_price ? ` + $${Number(t.additional_unit_price).toFixed(0)}/unit` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit count for residential tiers */}
          {selectedTier && segment === 'residential' && (
            <div>
              <Label>Unit Count (systems)</Label>
              <Input type="number" min={1} value={unitCount}
                onChange={(e) => setUnitCount(Math.max(1, Number(e.target.value) || 1))} />
            </div>
          )}

          {/* Customer */}
          <div>
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.first_name ?? '') + ' ' + (c.last_name ?? '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          {customerId && (
            <div>
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder="Select location (optional)" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.address_line1}, {l.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Auto-renew</Label>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>

          {/* Billing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Billing Model</Label>
              <Select value={billingModel} onValueChange={(v) => setBillingModel(v as MaintenanceBillingModel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visits / Year</Label>
              <Input type="number" min={1} max={12} value={visitsPerYear}
                onChange={(e) => setVisitsPerYear(Number(e.target.value) || 1)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {billingModel !== 'pay_per_visit' && (
              <div>
                <div className="flex items-center justify-between">
                  <Label>Annual Price</Label>
                  {selectedTier && segment === 'residential' && (
                    <button type="button" className="text-xs text-primary inline-flex items-center gap-1"
                      onClick={() => setPriceLocked((v) => !v)}>
                      {priceLocked ? <><Unlock className="w-3 h-3" /> Override</> : <><Lock className="w-3 h-3" /> Lock</>}
                    </button>
                  )}
                </div>
                <Input type="number" step="0.01" value={contractPrice}
                  readOnly={residentialLocked}
                  onChange={(e) => setContractPrice(e.target.value)} />
              </div>
            )}
            {billingModel === 'pay_per_visit' && (
              <div>
                <Label>Per-Visit Price</Label>
                <Input type="number" step="0.01" value={perVisitPrice}
                  onChange={(e) => setPerVisitPrice(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Filter Interval (days)</Label>
              <Input type="number" min={1} value={filterIntervalDays}
                onChange={(e) => setFilterIntervalDays(Number(e.target.value) || 90)} />
            </div>
          </div>

          {/* Inclusions */}
          {(selectedTier || inclusionsText) && (
            <div>
              <div className="flex items-center justify-between">
                <Label>What's Included</Label>
                {selectedTier && segment === 'residential' && (
                  <button type="button" className="text-xs text-primary inline-flex items-center gap-1"
                    onClick={() => setInclusionsLocked((v) => !v)}>
                    {inclusionsLocked ? <><Unlock className="w-3 h-3" /> Edit</> : <><Lock className="w-3 h-3" /> Lock</>}
                  </button>
                )}
              </div>
              <Textarea rows={3} value={inclusionsText}
                readOnly={inclusionsReadOnly}
                onChange={(e) => setInclusionsText(e.target.value)} />
            </div>
          )}

          {/* Filters */}
          <div className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="m-0">Filters</Label>
              <Button type="button" variant="outline" size="sm" onClick={addFilter}>
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
            {filters.length === 0 && (
              <p className="text-xs text-muted-foreground">No filter sizes added yet.</p>
            )}
            {filters.map((f, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Label className="text-xs">Size</Label>
                  <Input value={f.size} onChange={(e) => updateFilter(i, { size: e.target.value })} placeholder="16x25x1" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" min={1} value={f.quantity}
                    onChange={(e) => updateFilter(i, { quantity: Number(e.target.value) || 1 })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">MERV</Label>
                  <Input value={f.merv_rating ?? ''} onChange={(e) => updateFilter(i, { merv_rating: e.target.value })} />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Days</Label>
                  <Input type="number" min={1} value={f.interval_days}
                    onChange={(e) => updateFilter(i, { interval_days: Number(e.target.value) || 90 })} />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFilter(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Contract'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
