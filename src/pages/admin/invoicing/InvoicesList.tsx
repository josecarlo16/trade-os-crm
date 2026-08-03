import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOttoInvoices, useOttoLineItems, useOttoInvoicePayments } from '@/hooks/useOttoPay';
import { DocumentPreview, printDocument } from '@/components/invoicing/DocumentPreview';
import { StatusBadge } from '@/components/invoicing/StatusBadge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Download, MoreHorizontal, Eye, FileText, Printer, DollarSign, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { format, subDays, startOfMonth, subMonths, isAfter, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const statusTabs = ['all', 'draft', 'sent', 'paid', 'partial', 'overdue'] as const;
const PAGE_SIZE = 25;

const OTTOPAY_APP_URL = 'https://app.myottopay.com';

const InvoicesList = () => {
  const { data: invoices, isLoading } = useOttoInvoices();
  const [searchParams] = useSearchParams();
  const customerFilter = searchParams.get('customer');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Detail sheet data
  const { data: detailLineItems } = useOttoLineItems(selectedInvoice?.id ?? null);
  const { data: detailPayments } = useOttoInvoicePayments(selectedInvoice?.id ?? null);

  const filtered = useMemo(() => {
    let list = invoices || [];
    if (customerFilter) list = list.filter((i: any) => i.customer_id === customerFilter);
    if (statusFilter !== 'all') list = list.filter((i: any) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i: any) => i.invoice_number?.toLowerCase().includes(q) || i.customers?.name?.toLowerCase().includes(q));
    }
    const now = new Date();
    if (dateRange === 'this_month') { const s = startOfMonth(now); list = list.filter((i: any) => isAfter(new Date(i.created_at), s)); }
    else if (dateRange === 'last_month') { const s = startOfMonth(subMonths(now, 1)); const e = startOfMonth(now); list = list.filter((i: any) => isAfter(new Date(i.created_at), s) && isBefore(new Date(i.created_at), e)); }
    else if (dateRange === '90days') { const s = subDays(now, 90); list = list.filter((i: any) => isAfter(new Date(i.created_at), s)); }
    return list;
  }, [invoices, statusFilter, search, dateRange, customerFilter]);

  const totalValue = filtered.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const totalCollected = filtered.reduce((s: number, i: any) => s + (i.total_paid || 0), 0);
  const totalOutstanding = totalValue - totalCollected;
  const overdueCount = filtered.filter((i: any) => i.status === 'overdue' || (i.due_date && i.status !== 'paid' && isBefore(new Date(i.due_date), new Date()))).length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCSV = () => {
    if (!filtered.length) { toast.info('No data to export'); return; }
    const header = 'Invoice #,Customer,Invoice Date,Due Date,Total,Paid,Balance,Status';
    const rows = filtered.map((i: any) => [i.invoice_number, `"${i.customers?.name || ''}"`, i.invoice_date, i.due_date || '', i.total, i.total_paid, i.total - i.total_paid, i.status].join(','));
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const isOverdue = (dueDate: string | null, status: string) => dueDate && status !== 'paid' && isBefore(new Date(dueDate), new Date());
  const balanceDue = selectedInvoice ? selectedInvoice.total - selectedInvoice.total_paid : 0;

  return (
    <AdminLayout title="Invoices">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-blue-50"><FileText className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-xs text-muted-foreground">Total Invoices</p><p className="text-xl font-bold">{filtered.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-green-50"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-muted-foreground">Collected</p><p className="text-xl font-bold text-green-600">{fmt(totalCollected)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-yellow-50"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-xl font-bold text-yellow-600">{fmt(totalOutstanding)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-red-50"><AlertCircle className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-xs text-muted-foreground">Overdue</p><p className="text-xl font-bold text-red-600">{overdueCount}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoice # or customer…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
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
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
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
            <div className="p-6 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3" /><p className="text-sm">No invoices match your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((inv: any) => {
                  const balance = inv.total - inv.total_paid;
                  const overdue = isOverdue(inv.due_date, inv.status);
                  return (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedInvoice(inv)}>
                      <TableCell className="font-semibold text-primary">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.customers?.name || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.invoice_date || inv.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className={`text-xs ${overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>{inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(inv.total)}</TableCell>
                      <TableCell className="text-right text-green-600">{fmt(inv.total_paid)}</TableCell>
                      <TableCell className="text-right font-semibold">{balance > 0 ? fmt(balance) : '—'}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); setSelectedInvoice(inv); }}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); window.open(OTTOPAY_APP_URL, '_blank'); }}><ExternalLink className="h-4 w-4 mr-2" /> Manage in Otto Pay</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
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


      {/* Invoice Detail Sheet */}
      <Sheet open={!!selectedInvoice} onOpenChange={open => { if (!open) setSelectedInvoice(null); }}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0" side="right">
          {selectedInvoice && (
            <>
              <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3">
                    {selectedInvoice.invoice_number}
                    <StatusBadge status={selectedInvoice.status} />
                  </SheetTitle>
                </SheetHeader>
              </div>
              <div className="px-6 py-5">
                {/* Customer Info */}
                <div className="space-y-1 text-sm mb-6">
                  <p className="font-semibold text-base">{selectedInvoice.customers?.name || 'Unknown Customer'}</p>
                  {selectedInvoice.customers?.email && <p className="text-muted-foreground">{selectedInvoice.customers.email}</p>}
                  {selectedInvoice.customers?.phone && <p className="text-muted-foreground">{selectedInvoice.customers.phone}</p>}
                </div>

                {/* Document Preview */}
                <DocumentPreview
                  type="invoice"
                  documentNumber={selectedInvoice.invoice_number}
                  date={selectedInvoice.invoice_date || selectedInvoice.created_at}
                  dueDate={selectedInvoice.due_date}
                  customerName={selectedInvoice.customers?.name || 'Unknown'}
                  customerEmail={selectedInvoice.customers?.email}
                  customerPhone={selectedInvoice.customers?.phone}
                  customerAddress={selectedInvoice.customers?.address}
                  lineItems={(detailLineItems || []).map((li: any) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, line_total: li.line_total }))}
                  subtotal={selectedInvoice.subtotal}
                  taxRate={selectedInvoice.tax_rate}
                  taxAmount={selectedInvoice.tax_amount}
                  total={selectedInvoice.total}
                  totalPaid={selectedInvoice.total_paid}
                  notes={selectedInvoice.notes}
                  terms={selectedInvoice.terms}
                  status={selectedInvoice.status}
                />

                {/* Payment History */}
                {(detailPayments || []).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-sm mb-3">Payment History</h4>
                    <div className="space-y-2">
                      {(detailPayments || []).map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center text-sm border rounded-lg px-4 py-3">
                          <div>
                            <p className="font-medium text-green-600">{fmt(p.amount)}</p>
                            <p className="text-xs text-muted-foreground">{p.payment_method} · {format(new Date(p.payment_date), 'MMM d, yyyy')}</p>
                          </div>
                          {p.transaction_id && <span className="text-xs text-muted-foreground font-mono">{p.transaction_id.slice(0, 12)}…</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap mt-6 pt-4 border-t">
                  <Button size="sm" onClick={() => printDocument({
                    type: 'invoice',
                    documentNumber: selectedInvoice.invoice_number,
                    date: selectedInvoice.invoice_date || selectedInvoice.created_at,
                    dueDate: selectedInvoice.due_date,
                    customerName: selectedInvoice.customers?.name || 'Unknown',
                    customerEmail: selectedInvoice.customers?.email,
                    customerPhone: selectedInvoice.customers?.phone,
                    customerAddress: selectedInvoice.customers?.address,
                    lineItems: (detailLineItems || []).map((li: any) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, line_total: li.line_total })),
                    subtotal: selectedInvoice.subtotal,
                    taxRate: selectedInvoice.tax_rate,
                    taxAmount: selectedInvoice.tax_amount,
                    total: selectedInvoice.total,
                    totalPaid: selectedInvoice.total_paid,
                    notes: selectedInvoice.notes,
                    terms: selectedInvoice.terms,
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

export default InvoicesList;
