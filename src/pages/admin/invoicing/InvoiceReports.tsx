import { useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOttoMetrics, useOttoPayments, useOttoInvoices } from '@/hooks/useOttoPay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const PIE_COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(221 83% 53%)', 'hsl(var(--muted-foreground))'];

const InvoiceReports = () => {
  const { data: metrics, isLoading: mLoad } = useOttoMetrics();
  const { data: payments, isLoading: pLoad } = useOttoPayments();
  const { data: invoices, isLoading: iLoad } = useOttoInvoices();
  const isLoading = mLoad || pLoad || iLoad;

  const monthlyRevenue = useMemo(() => {
    if (!metrics?.invoices) return [];
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const m = subMonths(now, 11 - i);
      const s = startOfMonth(m); const e = endOfMonth(m);
      const rev = (metrics.invoices as any[]).filter(inv => inv.status === 'paid' && isWithinInterval(new Date(inv.created_at), { start: s, end: e })).reduce((sum: number, inv: any) => sum + inv.total, 0);
      return { month: format(m, 'MMM'), revenue: rev };
    });
  }, [metrics]);

  const methodBreakdown = useMemo(() => {
    if (!payments) return [];
    const map: Record<string, number> = {};
    (payments as any[]).forEach(p => { map[p.payment_method] = (map[p.payment_method] || 0) + p.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [payments]);

  const topCustomers = useMemo(() => {
    if (!invoices) return [];
    const map: Record<string, { name: string; total: number }> = {};
    (invoices as any[]).filter(i => i.status === 'paid').forEach(i => {
      const cid = i.customer_id;
      if (!map[cid]) map[cid] = { name: i.customers?.name || 'Unknown', total: 0 };
      map[cid].total += i.total;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [invoices]);

  return (
    <AdminLayout title="Revenue Reports">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: metrics?.totalRevenue ?? 0, icon: DollarSign, color: 'text-green-600' },
          { label: 'Outstanding', value: metrics?.outstanding ?? 0, icon: TrendingUp, color: 'text-yellow-600' },
          { label: 'Overdue', value: metrics?.overdueCount ?? 0, icon: AlertCircle, color: 'text-destructive', isCurrency: false },
        ].map(m => (
          <Card key={m.label}><CardContent className="pt-6 flex items-center gap-3">
            {isLoading ? <Skeleton className="h-12 w-full" /> : (
              <>
                <m.icon className={`h-6 w-6 ${m.color}`} />
                <div><p className="text-xs text-muted-foreground">{m.label}</p><p className="text-2xl font-bold">{m.isCurrency === false ? m.value : fmt(m.value)}</p></div>
              </>
            )}
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenue by Month</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px] w-full" /> : (
              <ChartContainer config={{ revenue: { label: 'Revenue', color: 'hsl(var(--primary))' } }} className="h-[280px] w-full">
                <BarChart data={monthlyRevenue}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="month" className="text-xs" /><YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} className="text-xs" /><ChartTooltip content={<ChartTooltipContent formatter={v => fmt(v as number)} />} /><Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} /></BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px] w-full" /> : methodBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No payment data</p>
            ) : (
              <ChartContainer config={{}} className="h-[280px] w-full">
                <PieChart><Pie data={methodBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {methodBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie><ChartTooltip content={<ChartTooltipContent formatter={v => fmt(v as number)} />} /></PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top Customers by Revenue</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
              <TableBody>
                {topCustomers.map((c, i) => (
                  <TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-right font-semibold text-green-700">{fmt(c.total)}</TableCell></TableRow>
                ))}
                {topCustomers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No data yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default InvoiceReports;
