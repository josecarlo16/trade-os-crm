import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOttoEstimates, useOttoEstimateLineItems } from '@/hooks/useOttoPay';
import { DocumentPreview, printDocument } from '@/components/invoicing/DocumentPreview';
import { StatusBadge } from '@/components/invoicing/StatusBadge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, MoreHorizontal, Eye, FileText, Printer, DollarSign, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { format, subDays, startOfMonth, subMonths, isAfter, isBefore } from 'date-fns';
import { toast } from 'sonner';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const statusTabs = ['all', 'draft', 'sent', 'accepted', 'declined', 'converted'] as const;
const PAGE_SIZE = 25;

const OTTOPAY_APP_URL = 'https://app.myottopay.com';

const OttoEstimatesList = () => {
  const { data: estimates, isLoading } = useOttoEstimates();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);

  const { data: detailLineItems } = useOttoEstimateLineItems(selectedEstimate?.id ?? null);

  const filtered = useMemo(() => {
    let list = estimates || [];
    if (statusFilter !== 'all') list = list.filter((e: any) => e.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e: any) => e.estimate_number?.toLowerCase().includes(q) || e.customers?.name?.toLowerCase().includes(q));
    }
    const now = new Date();
    if (dateRange === 'this_month') { const s = startOfMonth(now); list = list.filter((e: any) => isAfter(new Date(e.created_at), s)); }
    else if (dateRange === 'last_month') { const s = startOfMonth(subMonths(now, 1)); const end = startOfMonth(now); list = list.filter((e: any) => isAfter(new Date(e.created_at), s) && isBefore(new Date(e.created_at), end)); }
    else if (dateRange === '90days') { const s = subDays(now, 90); list = list.filter((e: any) => isAfter(new Date(e.created_at), s)); }
    return list;
  }, [estimates, statusFilter, search, dateRange]);

  const totalValue = filtered.reduce((s: number, e: any) => s + (e.total || 0), 0);
  const acceptedValue = filtered.filter((e: any) => e.status === 'accepted').reduce((s: number, e: any) => s + (e.total || 0), 0);
  const pendingCount = filtered.filter((e: any) => e.status === 'sent' || e.status === 'draft').length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);


  return (
    <AdminLayout title="Estimates">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-blue-50"><FileText className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-xs text-muted-foreground">Total Estimates</p><p className="text-xl font-bold">{filtered.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-green-50"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-muted-foreground">Total Value</p><p className="text-xl font-bold">{fmt(totalValue)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-emerald-50"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-xs text-muted-foreground">Accepted</p><p className="text-xl font-bold text-emerald-600">{fmt(acceptedValue)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-yellow-50"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-yellow-600">{pendingCount}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search estimate # or customer…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={dateRange} onValueChange={v => { setDateRange(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => window.open(OTTOPAY_APP_URL, '_blank')}><ExternalLink className="h-4 w-4 mr-1" /> Manage in Otto Pay</Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {statusTabs.map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className="capitalize" onClick={() => { setStatusFilter(s); setPage(0); }}>{s}</Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3" /><p className="text-sm">No estimates match your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((est: any) => (
                  <TableRow key={est.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEstimate(est)}>
                    <TableCell className="font-semibold text-primary">{est.estimate_number}</TableCell>
                    <TableCell>{est.customers?.name || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(est.estimate_date || est.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{est.valid_until ? format(new Date(est.valid_until), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(est.total)}</TableCell>
                    <TableCell><StatusBadge status={est.status} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setSelectedEstimate(est); }}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); window.open(OTTOPAY_APP_URL, '_blank'); }}><ExternalLink className="h-4 w-4 mr-2" /> Manage in Otto Pay</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">Page {page + 1} of {pageCount}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}


      {/* Estimate Detail Sheet */}
      <Sheet open={!!selectedEstimate} onOpenChange={open => { if (!open) setSelectedEstimate(null); }}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0" side="right">
          {selectedEstimate && (
            <>
              <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3">
                    {selectedEstimate.estimate_number}
                    <StatusBadge status={selectedEstimate.status} />
                  </SheetTitle>
                </SheetHeader>
              </div>
              <div className="px-6 py-5">
                <div className="space-y-1 text-sm mb-6">
                  <p className="font-semibold text-base">{selectedEstimate.customers?.name || 'Unknown'}</p>
                  {selectedEstimate.customers?.email && <p className="text-muted-foreground">{selectedEstimate.customers.email}</p>}
                </div>

                <DocumentPreview
                  type="estimate"
                  documentNumber={selectedEstimate.estimate_number}
                  date={selectedEstimate.estimate_date || selectedEstimate.created_at}
                  validUntil={selectedEstimate.valid_until}
                  customerName={selectedEstimate.customers?.name || 'Unknown'}
                  customerEmail={selectedEstimate.customers?.email}
                  customerPhone={selectedEstimate.customers?.phone}
                  customerAddress={selectedEstimate.customers?.address}
                  lineItems={(detailLineItems || []).map((li: any) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, line_total: li.line_total }))}
                  subtotal={selectedEstimate.subtotal}
                  taxRate={selectedEstimate.tax_rate || 0}
                  taxAmount={selectedEstimate.tax_amount}
                  total={selectedEstimate.total}
                  notes={selectedEstimate.notes}
                  terms={selectedEstimate.terms}
                  status={selectedEstimate.status}
                />

                <div className="flex gap-2 flex-wrap mt-6 pt-4 border-t">
                  <Button size="sm" onClick={() => printDocument({
                    type: 'estimate',
                    documentNumber: selectedEstimate.estimate_number,
                    date: selectedEstimate.estimate_date || selectedEstimate.created_at,
                    validUntil: selectedEstimate.valid_until,
                    customerName: selectedEstimate.customers?.name || 'Unknown',
                    customerEmail: selectedEstimate.customers?.email,
                    customerPhone: selectedEstimate.customers?.phone,
                    customerAddress: selectedEstimate.customers?.address,
                    lineItems: (detailLineItems || []).map((li: any) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, line_total: li.line_total })),
                    subtotal: selectedEstimate.subtotal,
                    taxRate: selectedEstimate.tax_rate || 0,
                    taxAmount: selectedEstimate.tax_amount,
                    total: selectedEstimate.total,
                    notes: selectedEstimate.notes,
                    terms: selectedEstimate.terms,
                  })}>
                    <Printer className="h-4 w-4 mr-1" /> Print / PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(OTTOPAY_APP_URL, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-1" /> Manage in Otto Pay
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default OttoEstimatesList;
