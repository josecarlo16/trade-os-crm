import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Home, DollarSign, ShoppingCart, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

export const DuctedMetricsCard = () => {
  const { data, isLoading } = useDashboardSummary();
  const metrics = data?.ductedMetrics;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Ducted Estimator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            Ducted Estimator
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">Central HVAC</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Total Quotes</span>
            </div>
            <p className="text-2xl font-bold">{metrics?.totalQuotes || 0}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics?.totalValue || 0)} total
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Avg Quote</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(metrics?.avgQuoteValue || 0)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">New:</span>
              <span className="font-medium">{metrics?.newCount || 0}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Closed:</span>
              <span className="font-medium">{metrics?.closedCount || 0}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingCart className="h-4 w-4" />
            Abandoned Carts
          </span>
          <Badge variant={metrics?.abandonedCarts ? "destructive" : "secondary"}>
            {metrics?.abandonedCarts || 0}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
