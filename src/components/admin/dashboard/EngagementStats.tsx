import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { MousePointer, TrendingUp, Sparkles } from 'lucide-react';
import { subDays, startOfDay } from 'date-fns';
import { HomepageHeatmap } from './HomepageHeatmap';

export const EngagementStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['engagement-stats'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(startOfDay(new Date()), 7).toISOString();

      // Fetch button clicks from last 7 days
      const { data: clicks, error } = await supabase
        .from('button_clicks')
        .select('*')
        .gte('clicked_at', sevenDaysAgo);

      if (error) throw error;

      const totalClicks = clicks?.length || 0;

      // Find top clicked button
      const buttonCounts: Record<string, number> = {};
      const locationCounts: Record<string, number> = {};
      
      clicks?.forEach(click => {
        buttonCounts[click.button_name] = (buttonCounts[click.button_name] || 0) + 1;
        locationCounts[click.button_location] = (locationCounts[click.button_location] || 0) + 1;
      });

      const topButton = Object.entries(buttonCounts)
        .sort(([, a], [, b]) => b - a)[0];

      return {
        totalClicks,
        topButtonName: topButton?.[0] || 'N/A',
        topButtonClicks: topButton?.[1] || 0,
        locationData: locationCounts,
      };
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          User Engagement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MousePointer className="h-4 w-4" />
              <span className="text-xs font-medium">Total Clicks (7d)</span>
            </div>
            <span className="text-2xl font-bold">{stats?.totalClicks || 0}</span>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Top Button</span>
            </div>
            <div>
              <span className="text-sm font-semibold truncate block">{stats?.topButtonName}</span>
              {stats?.topButtonClicks ? (
                <span className="text-xs text-muted-foreground">{stats.topButtonClicks} clicks</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <HomepageHeatmap 
          locationData={stats?.locationData || {}} 
          totalClicks={stats?.totalClicks || 0} 
        />
      </CardContent>
    </Card>
  );
};
