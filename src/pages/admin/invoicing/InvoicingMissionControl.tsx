import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useOttoMetrics, useOttoInvoices, useOttoPayments } from '@/hooks/useOttoPay';
import { InvoiceDetailSheet } from '@/components/invoicing/InvoiceDetailSheet';
import { BusinessSnapshotCard } from '@/components/invoicing/BusinessSnapshotCard';
import { DollarSign, Clock, AlertCircle, FileText } from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
};

const InvoicingMissionControl = () => {
  const { data: metrics, isLoading: metricsLoading } = useOttoMetrics();
  const { data: invoices, isLoading: invLoading } = useOttoInvoices();
  const { data: payments, isLoading: payLoading } = useOttoPayments();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Revenue trend — last 6 months from paid invoices in metrics
  const chartData = useMemo(() => {
    if (!metrics?.invoices) return [];
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const revenue = (metrics.invoices as any[])
        .filter(inv => inv.status === 'paid' && isWithinInterval(new Date(inv.created_at), { start, end }))
        .reduce((sum: number, inv: any) => sum + inv.total, 0);
      return { month: format(monthDate, 'MMM yyyy'), revenue };
    });
  }, [metrics]);

  const chartConfig = { revenue: { label: 'Revenue', color: 'hsl(var(--primary))' } };

  const metricCards = [
    { title: 'Total Revenue', value: metrics?.totalRevenue, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Outstanding', value: metrics?.outstanding, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { title: 'Overdue', value: metrics?.overdueCount, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', isCurrency: false },
    { title: 'This Month', value: metrics?.thisMonth, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', isCurrency: false },
  ];

  const recentInvoices = (invoices || []).slice(0, 10);
  const recentPayments = (payments || []).slice(0, 10);

  return (
    <AdminLayout title="Invoicing Mission Control">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metricCards.map(mc => (
          <Card key={mc.title}>
            <CardContent className="pt-6">
              {metricsLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2.5 ${mc.bg}`}>
                    <mc.icon className={`h-5 w-5 ${mc.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{mc.title}</p>
                    <p className="text-2xl font-bold">
                      {mc.isCurrency === false ? mc.value : fmt(mc.value ?? 0)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Business Snapshot */}
      <BusinessSnapshotCard
        metrics={metrics}
        recentPaymentsCount={payments?.length || 0}
        metricsLoading={metricsLoading}
      />

      {/* Revenue chart */}
      <Card className="mt-6 mb-6">
        <CardHeader><CardTitle className="text-base">Revenue Trend (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          {metricsLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(value as number)} />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
          <CardContent>
            {invLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((inv: any) => (
                    <TableRow key={inv.id} className="cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.customers?.name || '—'}</TableCell>
                      <TableCell className="text-right">{fmt(inv.total)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[inv.status] || ''}`}>
                          {inv.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{format(new Date(inv.created_at), 'MMM d')}</TableCell>
                    </TableRow>
                  ))}
                  {recentInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No invoices yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payment Activity */}
        <Card>
          <CardHeader><CardTitle className="text-base">Payment Activity</CardTitle></CardHeader>
          <CardContent>
            {payLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No payments yet</p>
            ) : (
              <div className="divide-y">
                {recentPayments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{p.invoices?.customers?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(p.payment_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{fmt(p.amount)}</p>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{p.payment_method}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InvoiceDetailSheet
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}
      />
    </AdminLayout>
  );
};

export default InvoicingMissionControl;
