import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOttoPayments } from '@/hooks/useOttoPay';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, CreditCard, TrendingUp, Hash, Download, Copy, Check } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const methodColors: Record<string, string> = {
  stripe: 'bg-purple-100 text-purple-800',
  cash: 'bg-green-100 text-green-800',
  check: 'bg-blue-100 text-blue-800',
  manual: 'bg-muted text-muted-foreground',
};

const PaymentsList = () => {
  const { data: payments, isLoading } = useOttoPayments();
  const [dateRange, setDateRange] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = payments || [];
    if (methodFilter !== 'all') list = list.filter((p: any) => p.payment_method === methodFilter);
    if (dateRange !== 'all') {
      const now = new Date();
      let start: Date;
      if (dateRange === 'this_month') start = startOfMonth(now);
      else if (dateRange === 'last_month') start = startOfMonth(subMonths(now, 1));
      else start = subDays(now, 90);
      const end = dateRange === 'last_month' ? endOfMonth(subMonths(now, 1)) : now;
      list = list.filter((p: any) => {
        const d = new Date(p.payment_date);
        return d >= start && d <= end;
      });
    }
    return list;
  }, [payments, dateRange, methodFilter]);

  const totalCollected = (payments || []).reduce((s: number, p: any) => s + p.amount, 0);
  const thisMonthTotal = (payments || []).filter((p: any) => {
    const d = new Date(p.payment_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s: number, p: any) => s + p.amount, 0);
  const avgPayment = (payments || []).length ? totalCollected / (payments || []).length : 0;

  const copyTxn = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Transaction ID copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = () => {
    const rows = [['Date', 'Customer', 'Invoice #', 'Amount', 'Method', 'Transaction ID']];
    filtered.forEach((p: any) => {
      rows.push([
        format(new Date(p.payment_date), 'MM/dd/yyyy'),
        p.invoices?.customers?.name || '',
        p.invoices?.invoice_number || '',
        p.amount.toFixed(2),
        p.payment_method,
        p.transaction_id || '',
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metrics = [
    { label: 'Total Collected', value: fmt(totalCollected), icon: DollarSign, color: 'text-green-600' },
    { label: 'This Month', value: fmt(thisMonthTotal), icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Avg Payment', value: fmt(avgPayment), icon: CreditCard, color: 'text-purple-600' },
    { label: 'Total Transactions', value: (payments || []).length.toString(), icon: Hash, color: 'text-muted-foreground' },
  ];

  return (
    <AdminLayout title="Payment History">
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(m => (
            <Card key={m.label}>
              <CardContent className="p-4 flex items-center gap-3">
                {isLoading ? <Skeleton className="h-12 w-full" /> : (
                  <>
                    <div className={`p-2 rounded-lg bg-muted ${m.color}`}><m.icon className="h-5 w-5" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-lg font-bold">{m.value}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="90_days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Transaction ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No payments found</TableCell></TableRow>
              ) : filtered.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{format(new Date(p.payment_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-medium">{p.invoices?.customers?.name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.invoices?.invoice_number || '—'}</TableCell>
                  <TableCell className="text-right font-semibold text-green-700">{fmt(p.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={methodColors[p.payment_method] || ''}>{p.payment_method}</Badge>
                  </TableCell>
                  <TableCell>
                    {p.transaction_id ? (
                      <button onClick={() => copyTxn(p.transaction_id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono">
                        {p.transaction_id.slice(0, 12)}…
                        {copiedId === p.transaction_id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default PaymentsList;
