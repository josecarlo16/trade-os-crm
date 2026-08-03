import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessSnapshot } from '@/hooks/useOttoAI';
import { Brain, RefreshCw } from 'lucide-react';

interface BusinessSnapshotCardProps {
  metrics: {
    totalRevenue: number;
    outstanding: number;
    overdueCount: number;
    thisMonth: number;
  } | undefined;
  recentPaymentsCount: number;
  metricsLoading: boolean;
}

export function BusinessSnapshotCard({ metrics, recentPaymentsCount, metricsLoading }: BusinessSnapshotCardProps) {
  const { summary, loading, refresh } = useBusinessSnapshot();

  useEffect(() => {
    if (metrics && !summary && !loading) {
      refresh({
        totalRevenue: metrics.totalRevenue,
        outstanding: metrics.outstanding,
        overdueCount: metrics.overdueCount,
        thisMonth: metrics.thisMonth,
        recentPayments: recentPaymentsCount,
      });
    }
  }, [metrics]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Business Snapshot
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => metrics && refresh({
            totalRevenue: metrics.totalRevenue,
            outstanding: metrics.outstanding,
            overdueCount: metrics.overdueCount,
            thisMonth: metrics.thisMonth,
            recentPayments: recentPaymentsCount,
          })}
          disabled={loading || metricsLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading || metricsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        ) : summary ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">AI summary will appear here once metrics load.</p>
        )}
      </CardContent>
    </Card>
  );
}
