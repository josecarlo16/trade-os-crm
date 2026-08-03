import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOttoMetrics } from '@/hooks/useOttoPay';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function InvoicingSnapshot() {
  const { data, isLoading } = useOttoMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Invoicing Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  const outstanding = data?.outstanding ?? 0;
  const paidThisMonth = (data?.invoices || [])
    .filter((i: any) => {
      if (i.status !== 'paid') return false;
      const d = new Date(i.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s: number, i: any) => s + i.total, 0);
  const overdueCount = data?.overdueCount ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Invoicing Snapshot
          </CardTitle>
          <Link
            to="/admin/invoicing"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Open Mission Control <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Outstanding */}
        <div>
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <p className="text-2xl font-bold text-yellow-600">{fmt(outstanding)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Paid this month */}
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Paid This Month</p>
              <p className="text-sm font-semibold text-green-600">{fmt(paidThisMonth)}</p>
            </div>
          </div>

          {/* Overdue */}
          <div className="flex items-start gap-2">
            <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${overdueCount > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className={`text-sm font-semibold ${overdueCount > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {overdueCount} invoice{overdueCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
