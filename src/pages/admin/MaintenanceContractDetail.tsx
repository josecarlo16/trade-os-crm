import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, ExternalLink, Save, Calendar as CalIcon, Plus, Trash2 } from 'lucide-react';
import {
  useMaintenanceContract,
  useUpdateContract,
  useContractFilters,
  useContractVisits,
  useAddContractFilter,
  useUpdateContractFilter,
  useDeleteContractFilter,
  useLogVisit,
} from '@/hooks/useMaintenanceContracts';
import {
  STATUS_OPTIONS, BILLING_OPTIONS, VISIT_TYPE_OPTIONS,
  type MaintenanceStatus, type MaintenanceBillingModel, type MaintenanceVisitType,
} from '@/types/maintenanceContracts';
import { formatDate, getDueBadge, badgeClass, computeNextFilterDue, toISODate, addDays } from '@/lib/maintenance/dueDateUtils';
import { toast } from 'sonner';

export default function MaintenanceContractDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: contract, isLoading } = useMaintenanceContract(id);
  const { data: filters = [] } = useContractFilters(id);
  const { data: visits = [] } = useContractVisits(id);

  if (isLoading) return <AdminLayout title="Maintenance Contract"><div className="p-6">Loading…</div></AdminLayout>;
  if (!contract) return <AdminLayout title="Maintenance Contract"><div className="p-6">Contract not found.</div></AdminLayout>;

  const cust = contract.customer;
  const loc = contract.location;

  return (
    <AdminLayout title="Maintenance Contract">
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/contracts"><ArrowLeft className="w-4 h-4" /> Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{contract.contract_number}</div>
          <h1 className="text-2xl font-semibold">
            {(cust?.first_name ?? '') + ' ' + (cust?.last_name ?? '')}
          </h1>
          {loc && (
            <div className="text-sm text-muted-foreground">
              {loc.address_line1}, {loc.city}, {loc.state} {loc.zip_code}
            </div>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{contract.segment}</Badge>
            <Badge variant={contract.status === 'active' ? 'default' : 'secondary'} className="capitalize">
              {contract.status}
            </Badge>
            {contract.tier && <Badge variant="secondary">{contract.tier}</Badge>}
            {contract.tier_name_snapshot && contract.tier_name_snapshot !== contract.tier && (
              <Badge variant="outline">Snapshot: {contract.tier_name_snapshot}</Badge>
            )}
          </div>
        </div>
        {contract.workedge_property_id && (
          <Button variant="outline" asChild>
            <a href={`https://app.workedge.com/property/${contract.workedge_property_id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4" /> View on WorkEdge
            </a>
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab contract={contract} /></TabsContent>
        <TabsContent value="visits"><VisitsTab contractId={contract.id} visits={visits} contract={contract} /></TabsContent>
        <TabsContent value="filters"><FiltersTab contractId={contract.id} filters={filters} defaultInterval={contract.filter_change_interval_days} /></TabsContent>
        <TabsContent value="equipment">
          <Card><CardContent className="p-6 text-muted-foreground">Equipment from WorkEdge — coming in Phase 2.</CardContent></Card>
        </TabsContent>
        <TabsContent value="billing">
          <Card><CardContent className="p-6 text-muted-foreground">Otto Pay invoice history — coming in Phase 2.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}

function OverviewTab({ contract }: { contract: ReturnType<typeof useMaintenanceContract>['data'] & {} }) {
  const update = useUpdateContract();
  const [form, setForm] = useState({
    status: contract.status,
    tier: contract.tier ?? '',
    start_date: contract.start_date,
    end_date: contract.end_date ?? '',
    auto_renew: contract.auto_renew,
    billing_model: contract.billing_model,
    contract_price: contract.contract_price?.toString() ?? '',
    per_visit_price: contract.per_visit_price?.toString() ?? '',
    visits_per_year: contract.visits_per_year,
    filter_change_interval_days: contract.filter_change_interval_days,
    notes: contract.notes ?? '',
  });

  async function save() {
    try {
      await update.mutateAsync({
        id: contract.id,
        patch: {
          status: form.status as MaintenanceStatus,
          tier: form.tier || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          auto_renew: form.auto_renew,
          billing_model: form.billing_model as MaintenanceBillingModel,
          contract_price: form.contract_price ? Number(form.contract_price) : null,
          per_visit_price: form.per_visit_price ? Number(form.per_visit_price) : null,
          visits_per_year: form.visits_per_year,
          filter_change_interval_days: form.filter_change_interval_days,
          notes: form.notes || null,
        },
      });
      toast.success('Contract updated');
    } catch (e: any) {
      toast.error(e?.message ?? 'Update failed');
    }
  }

  return (
    <div className="space-y-4">
      {contract.inclusions_text && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">What's Included</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{contract.inclusions_text}</p>
            {contract.billing_model === 'pay_per_visit' && contract.per_visit_price != null && (
              <p className="text-sm mt-3"><span className="text-muted-foreground">Per-visit price:</span> <span className="font-medium">${Number(contract.per_visit_price).toFixed(2)}</span></p>
            )}
          </CardContent>
        </Card>
      )}
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MaintenanceStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tier</Label>
            <Input value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} />
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <Label>Auto-renew</Label>
              <div className="h-10 flex items-center">
                <Switch checked={form.auto_renew} onCheckedChange={(v) => setForm({ ...form, auto_renew: v })} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Start</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div>
            <Label>Visits / Year</Label>
            <Input type="number" min={1} value={form.visits_per_year}
              onChange={(e) => setForm({ ...form, visits_per_year: Number(e.target.value) || 1 })} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Billing Model</Label>
            <Select value={form.billing_model} onValueChange={(v) => setForm({ ...form, billing_model: v as MaintenanceBillingModel })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BILLING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Annual Price</Label>
            <Input type="number" step="0.01" value={form.contract_price}
              onChange={(e) => setForm({ ...form, contract_price: e.target.value })} />
          </div>
          <div>
            <Label>Per-Visit Price</Label>
            <Input type="number" step="0.01" value={form.per_visit_price}
              onChange={(e) => setForm({ ...form, per_visit_price: e.target.value })} />
          </div>
        </div>

        <div>
          <Label>Filter Interval (days)</Label>
          <Input type="number" min={1} className="max-w-xs" value={form.filter_change_interval_days}
            onChange={(e) => setForm({ ...form, filter_change_interval_days: Number(e.target.value) || 90 })} />
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <div className="text-sm text-muted-foreground self-center">
            Next visit: {formatDate(contract.next_visit_due)} • Next filter: {formatDate(contract.next_filter_due)}
          </div>
          <Button onClick={save} disabled={update.isPending}>
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

function VisitsTab({
  contractId, visits, contract,
}: {
  contractId: string;
  visits: any[];
  contract: any;
}) {
  const log = useLogVisit();
  const [open, setOpen] = useState(false);
  const [visitDate, setVisitDate] = useState(toISODate(new Date()));
  const [visitType, setVisitType] = useState<MaintenanceVisitType>('spring_tune_up');
  const [filtersChanged, setFiltersChanged] = useState(false);
  const [notes, setNotes] = useState('');

  async function submit() {
    try {
      await log.mutateAsync({
        contract_id: contractId,
        visit_date: visitDate,
        visit_type: visitType,
        filters_changed: filtersChanged,
        notes: notes || null,
      });
      toast.success('Visit logged');
      setOpen(false);
      setNotes('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Visit History</CardTitle>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="w-4 h-4" /> {open ? 'Cancel' : 'Log Visit'}
        </Button>
      </CardHeader>
      <CardContent>
        {open && (
          <div className="border rounded-md p-3 mb-4 space-y-3 bg-muted/30">
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={visitType} onValueChange={(v) => setVisitType(v as MaintenanceVisitType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <Label>Filters Changed</Label>
                  <div className="h-10 flex items-center">
                    <Switch checked={filtersChanged} onCheckedChange={setFiltersChanged} />
                  </div>
                </div>
              </div>
            </div>
            <Textarea placeholder="Notes…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={log.isPending}>Save Visit</Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Filters</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No visits logged yet.</TableCell></TableRow>
            )}
            {visits.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{formatDate(v.visit_date)}</TableCell>
                <TableCell className="capitalize">{v.visit_type.replace('_', ' ')}</TableCell>
                <TableCell>
                  {v.technician
                    ? `${v.technician.first_name ?? ''} ${v.technician.last_name ?? ''}`
                    : '—'}
                </TableCell>
                <TableCell>{v.filters_changed ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-md truncate">{v.notes ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FiltersTab({
  contractId, filters, defaultInterval,
}: {
  contractId: string; filters: any[]; defaultInterval: number;
}) {
  const add = useAddContractFilter();
  const upd = useUpdateContractFilter();
  const del = useDeleteContractFilter();

  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [merv, setMerv] = useState('');
  const [interval, setInterval] = useState(defaultInterval);

  async function addRow() {
    if (!size.trim()) return;
    const today = toISODate(new Date());
    await add.mutateAsync({
      contract_id: contractId,
      size: size.trim(),
      quantity: qty,
      merv_rating: merv || null,
      interval_days: interval,
      last_changed: today,
      next_due: computeNextFilterDue(today, interval),
    });
    setSize(''); setMerv(''); setQty(1);
    toast.success('Filter added');
  }

  async function logChange(row: any) {
    const today = toISODate(new Date());
    await upd.mutateAsync({
      id: row.id, contract_id: contractId,
      patch: { last_changed: today, next_due: computeNextFilterDue(today, row.interval_days) },
    });
    toast.success('Filter change logged');
  }

  async function remove(row: any) {
    await del.mutateAsync({ id: row.id, contract_id: contractId });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-12 gap-2 items-end border rounded-md p-3 bg-muted/30">
          <div className="md:col-span-3">
            <Label>Size</Label>
            <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="20x25x4" />
          </div>
          <div className="md:col-span-2">
            <Label>Qty</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} />
          </div>
          <div className="md:col-span-2">
            <Label>MERV</Label>
            <Input value={merv} onChange={(e) => setMerv(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Interval (days)</Label>
            <Input type="number" min={1} value={interval} onChange={(e) => setInterval(Number(e.target.value) || 90)} />
          </div>
          <div className="md:col-span-3">
            <Button onClick={addRow} disabled={add.isPending} className="w-full">
              <Plus className="w-4 h-4" /> Add Filter
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Size</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>MERV</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Last Changed</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filters.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No filters added yet.</TableCell></TableRow>
            )}
            {filters.map((f) => {
              const b = getDueBadge(f.next_due);
              return (
                <TableRow key={f.id}>
                  <TableCell>{f.size}</TableCell>
                  <TableCell>{f.quantity}</TableCell>
                  <TableCell>{f.merv_rating ?? '—'}</TableCell>
                  <TableCell>{f.interval_days}d</TableCell>
                  <TableCell>{formatDate(f.last_changed)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${badgeClass(b)}`}>
                      {formatDate(f.next_due)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => logChange(f)}>
                      <CalIcon className="w-4 h-4" /> Log change
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(f)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
