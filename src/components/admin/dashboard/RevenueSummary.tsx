import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, Receipt, PieChart } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

export const RevenueSummary = () => {
  const { data, isLoading } = useDashboardSummary();
  const revenue = data?.revenue;

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
            <DollarSign className="h-5 w-5 text-primary" />
            Revenue Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: 'Ducted', value: revenue?.ductedTotal || 0, color: 'hsl(var(--primary))' },
    { name: 'Ductless', value: revenue?.ductlessTotal || 0, color: 'hsl(var(--secondary))' },
  ].filter(d => d.value > 0);

  const stats = [
    { label: 'Total Quoted', value: formatCurrency(revenue?.totalQuoted || 0), icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'Avg Quote Value', value: formatCurrency(revenue?.averageQuote || 0), icon: Receipt, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { label: 'Closed Revenue', value: formatCurrency(revenue?.closedValue || 0), icon: TrendingUp, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    { label: 'Total Quotes', value: (revenue?.ductedCount || 0) + (revenue?.ductlessCount || 0), icon: PieChart, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Revenue Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className={`p-1.5 rounded ${stat.bgColor}`}>
                  <stat.icon className={`h-3 w-3 ${stat.color}`} />
                </div>
                <span className="text-xs font-medium">{stat.label}</span>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {pieData.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Revenue by Estimator Type</p>
            <div className="flex items-center gap-4">
              <div className="h-[100px] w-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={45}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm">
                    Ducted: {formatCurrency(revenue?.ductedTotal || 0)} ({revenue?.ductedCount || 0})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-secondary" />
                  <span className="text-sm">
                    Ductless: {formatCurrency(revenue?.ductlessTotal || 0)} ({revenue?.ductlessCount || 0})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
