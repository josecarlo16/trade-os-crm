import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BriefingData {
  generated_at: string;
  today_appointments: Array<{
    id: string;
    time: string;
    end_time: string;
    job_number: string;
    customer: string;
    phone: string;
    job_type: string;
    location?: string | null;
    team: string;
    team_color: string;
  }>;
  tomorrow_appointments: Array<{
    id: string;
    time: string;
    job_number: string;
    customer: string;
    job_type: string;
    team: string;
  }>;
  new_submissions_count: number;
  new_submissions_breakdown: Record<string, number>;
  uncontacted_leads_count: number;
  stale_estimates_count: number;
  recent_wins: Array<{
    customer: string;
    value: number;
    date: string;
  }>;
  recent_wins_total: number;
  alerts: Array<{
    type: string;
    severity: "info" | "warning" | "urgent";
    title: string;
    detail: string;
    entity_id?: string;
    entity_type?: string;
  }>;
  alerts_by_severity: {
    urgent: number;
    warning: number;
    info: number;
  };
  badge_count: number;
}

export function useBriefing({ enabled = true }: { enabled?: boolean } = {}) {
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetchedBriefing, setHasFetchedBriefing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchBriefing = useCallback(async () => {
    if (!enabled) return null;
    // Wait for a valid user session before calling the edge function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistant-briefing");
      if (error) throw error;

      setBriefingData(data);
      setBadgeCount(data?.badge_count || 0);
      setLastFetched(new Date());
      setHasFetchedBriefing(true);
      return data;
    } catch (err) {
      console.error("Failed to fetch briefing:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    fetchBriefing();

    // Refresh every 15 minutes
    const interval = setInterval(fetchBriefing, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBriefing, enabled]);

  return {
    briefingData,
    badgeCount,
    isLoading,
    hasFetchedBriefing,
    lastFetched,
    fetchBriefing,
  };
}
