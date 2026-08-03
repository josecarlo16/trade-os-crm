import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface Submission {
  id: string;
  status: string;
}

interface StatusChartProps {
  submissions: Submission[];
}

const STATUS_COLORS: Record<string, string> = {
  new: 'hsl(45, 90%, 50%)',
  reviewed: 'hsl(210, 70%, 50%)',
  contacted: 'hsl(280, 60%, 55%)',
  closed: 'hsl(160, 60%, 45%)',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  contacted: 'Contacted',
  closed: 'Closed',
};

export const StatusChart = ({ submissions }: StatusChartProps) => {
  const chartData = useMemo(() => {
    const statusCount = submissions.reduce((acc, submission) => {
      const status = submission.status || 'new';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(STATUS_LABELS).map(([key, label]) => ({
      status: label,
      count: statusCount[key] || 0,
      fill: STATUS_COLORS[key],
    }));
  }, [submissions]);

  const chartConfig = {
    count: {
      label: 'Count',
    },
    new: {
      label: 'New',
      color: STATUS_COLORS.new,
    },
    reviewed: {
      label: 'Reviewed',
      color: STATUS_COLORS.reviewed,
    },
    contacted: {
      label: 'Contacted',
      color: STATUS_COLORS.contacted,
    },
    closed: {
      label: 'Closed',
      color: STATUS_COLORS.closed,
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">By Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis 
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              allowDecimals={false}
            />
            <YAxis 
              type="category"
              dataKey="status"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              width={80}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar 
              dataKey="count" 
              radius={[0, 4, 4, 0]}
              fill="hsl(var(--primary))"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
