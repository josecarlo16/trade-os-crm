import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Wrench, AlertTriangle, Calendar, Filter as FilterIcon, DollarSign, Sparkles, Tags } from 'lucide-react';
import { useMaintenanceContracts } from '@/hooks/useMaintenanceContracts';
import {
  STATUS_OPTIONS, BILLING_OPTIONS,
  type MaintenanceSegment, type MaintenanceStatus, type MaintenanceBillingModel,
} from '@/types/maintenanceContracts';
import { formatDate, getDueBadge, badgeClass, parseDate, todayCST, daysBetween } from '@/lib/maintenance/dueDateUtils';
import { NewContractDialog } from '@/components/admin/maintenance/NewContractDialog';

export default function MaintenanceContracts() {
  const [segment, setSegment] = useState<MaintenanceSegment | 'all'>('all');
  const [status, setStatus] = useState<MaintenanceStatus | 'all'>('all');
  const [billing, setBilling] = useState<MaintenanceBillingModel | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dueSoon, setDueSoon] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: contracts = [], isLoading } = useMaintenanceContracts({
    segment, status, billing, search, dueSoon,
  });

  const kpis = useMemo(() => {
    const today = todayCST();
    const monthEnd = new Date(today);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const in60 = new Date(today);
    in60.setDate(in60.getDate() + 60);

    let activeRes = 0, activeCom = 0, visitsThisMonth = 0, filtersThisMonth = 0, renewals60 = 0, arr = 0;
    for (const c of contracts) {
      if (c.status === 'active') {
        if (c.segment === 'residential') activeRes++; else activeCom++;
        if (c.billing_model !== 'pay_per_visit' && c.contract_price) arr += Number(c.contract_price);
      }
      const nv = parseDate(c.next_visit_due);
      if (nv && nv >= today && nv <= monthEnd) visitsThisMonth++;
      const nf = parseDate(c.next_filter_due);
      if (nf && nf >= today && nf <= monthEnd) filtersThisMonth++;
      const ed = parseDate(c.end_date);
      if (ed && ed >= today && ed <= in60) renewals60++;
    }
    return { activeRes, activeCom, visitsThisMonth, filtersThisMonth, renewals60, arr };
  }, [contracts]);

  return (
    <AdminLayout title="Maintenance Contracts">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wrench className="w-6 h-6" /> Maintenance Contracts
          </h1>
          <p className="text-sm text-muted-foreground">Track residential & commercial agreements, visits, and filters.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/contracts/candidates"><Sparkles className="w-4 h-4" /> Find Candidates</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/maintenance-contracts/tiers"><Tags className="w-4 h-4" /> Pricing & Tiers</Link>
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" /> New Contract
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={<Wrench className="w-4 h-4" />} label="Active" value={`${kpis.activeRes + kpis.activeCom}`} hint={`${kpis.activeRes} res / ${kpis.activeCom} com`} />
        <KpiCard icon={<Calendar className="w-4 h-4" />} label="Visits this month" value={kpis.visitsThisMonth} />
        <KpiCard icon={<FilterIcon className="w-4 h-4" />} label="Filters this month" value={kpis.filtersThisMonth} />
        <KpiCard icon={<AlertTriangle className="w-4 h-4" />} label="Renewals (60d)" value={kpis.renewals60} />
        <KpiCard icon={<DollarSign className="w-4 h-4" />} label="ARR" value={`$${kpis.arr.toLocaleString()}`} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Tabs value={segment} onValueChange={(v) => setSegment(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="residential">Residential</TabsTrigger>
              <TabsTrigger value="commercial">Commercial</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search customer, address, contract #" value={search}
              onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={billing} onValueChange={(v) => setBilling(v as any)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Billing" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All billing</SelectItem>
                {BILLING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={dueSoon ? 'default' : 'outline'} onClick={() => setDueSoon((v) => !v)}>
              Due ≤ 30 days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-card sticky top-0 shadow-sm z-10">
                <TableHead>Contract #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Next Visit</TableHead>
                <TableHead>Next Filter</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && contracts.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No contracts yet.</TableCell></TableRow>
              )}
              {contracts.map((c) => {
                const visitB = getDueBadge(c.next_visit_due);
                const filterB = getDueBadge(c.next_filter_due);
                return (
                  <TableRow key={c.id} className="hover:bg-muted/40">
                    <TableCell>
                      <Link to={`/admin/contracts/${c.id}`} className="text-primary underline-offset-2 hover:underline">
                        {c.contract_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {(c.customer?.first_name ?? '') + ' ' + (c.customer?.last_name ?? '')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.location ? `${c.location.address_line1}, ${c.location.city}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{c.segment}</Badge>
                    </TableCell>
                    <TableCell>{c.tier ?? '—'}</TableCell>
                    <TableCell className="capitalize">{c.billing_model.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${badgeClass(visitB)}`}>
                        {formatDate(c.next_visit_due)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${badgeClass(filterB)}`}>
                        {formatDate(c.next_filter_due)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewContractDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
    </AdminLayout>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
