import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, ArrowRight } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

const STAGE_DISPLAY: Record<string, { name: string; color: string; bgColor: string }> = {
  partial: { name: 'Abandoned', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  new: { name: 'New', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  reviewed: { name: 'Reviewed', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  contacted: { name: 'Contacted', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  closed: { name: 'Closed', color: 'text-green-600', bgColor: 'bg-green-100' },
};

export const PipelineStatus = () => {
  const { data, isLoading } = useDashboardSummary();

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Pipeline Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1">
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stages = (data?.pipelineStages || []).map(s => ({
    ...s,
    ...STAGE_DISPLAY[s.name],
  }));

  const total = stages.reduce((sum, s) => sum + s.count, 0);
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const closedCount = stages.find(s => s.name === 'closed')?.count || 0;
  const abandonedCount = stages.find(s => s.name === 'partial')?.count || 0;
  const conversionRate = total - abandonedCount > 0
    ? ((closedCount / (total - abandonedCount)) * 100).toFixed(1)
    : '0';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          Pipeline Status
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {total} total leads
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-stretch gap-1">
          {stages.map((stage, index) => {
            const heightPercent = (stage.count / maxCount) * 100;
            const minHeight = stage.count > 0 ? 30 : 20;
            return (
              <div key={stage.name} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end h-[80px]">
                  <div
                    className={`w-full rounded-t-lg transition-all ${stage.bgColor}`}
                    style={{
                      height: `${Math.max(heightPercent, minHeight)}%`,
                      minHeight: `${minHeight}px`,
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-full p-1">
                      <span className={`text-lg font-bold ${stage.color}`}>{stage.count}</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium truncate">{stage.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(stage.value)}</p>
                </div>
                {index < stages.length - 1 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 hidden md:block">
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Conversion Rate</span>
            <span className="font-medium">{conversionRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on submitted quotes (excludes abandoned)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
