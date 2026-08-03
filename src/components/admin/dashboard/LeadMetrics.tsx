import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Users, Target, Clock, BarChart3 } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
}

export const LeadMetrics = () => {
  const { data, isLoading } = useDashboardSummary();
  const metrics = data?.leadMetrics;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lead Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricCards: MetricCard[] = [
    { label: 'Total Leads', value: metrics?.total || 0, icon: Users },
    { label: 'Conversion Rate', value: `${metrics?.conversionRate || 0}%`, icon: Target },
    { label: 'This Week', value: metrics?.thisWeekLeads || 0, change: metrics?.weekGrowth, icon: Clock },
    { label: 'Top Source', value: metrics?.topSource || 'N/A', icon: BarChart3 },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Lead Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricCards.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <metric.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{metric.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{metric.value}</span>
                {metric.change !== undefined && (
                  <span className={`flex items-center text-xs font-medium ${
                    metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {Math.abs(metric.change)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
