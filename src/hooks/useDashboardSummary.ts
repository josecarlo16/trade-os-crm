import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardSummary {
  stats: {
    total: number;
    new: number;
    reviewed: number;
    thisWeek: number;
  };
  leadMetrics: {
    total: number;
    conversionRate: number;
    thisWeekLeads: number;
    weekGrowth: number;
    topSource: string;
  };
  revenue: {
    totalQuoted: number;
    averageQuote: number;
    ductedTotal: number;
    ductlessTotal: number;
    ductedCount: number;
    ductlessCount: number;
    closedValue: number;
  };
  pipelineStages: { name: string; count: number; value: number }[];
  ductedMetrics: {
    totalQuotes: number;
    totalValue: number;
    avgQuoteValue: number;
    abandonedCarts: number;
    syncedCount: number;
    pendingCount: number;
    failedCount: number;
    newCount: number;
    closedCount: number;
  };
  ductlessMetrics: DashboardSummary['ductedMetrics'] & { avgZoneCount: number };
  recentSubmissions: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    service_type: string | null;
    status: string;
    created_at: string;
    source: string;
  }>;
  chartSubmissions: Array<{ id: string; created_at: string }>;
  generatedAt: string;
}

/**
 * Single source of truth for the admin dashboard. Replaces ~8 separate widget
 * fetches with one server-side aggregation. Cached for 60s and shared across
 * all consumers via React Query.
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async (): Promise<DashboardSummary> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }
      const { data, error } = await supabase.functions.invoke('dashboard-summary');
      if (error) throw error;
      return data as DashboardSummary;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
