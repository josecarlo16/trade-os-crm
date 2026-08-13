import { useEffect, useState, useCallback } from 'react';
import { supabase, freshChannel } from '@/integrations/supabase/client';

/**
 * Counts unread/new submissions across all tracked form tables.
 * A submission is considered "new" when its status is null or 'new'.
 * Marking it as anything else (reviewed/contacted/closed/junk) clears it.
 */
export function useNewSubmissionsCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    const tables = [
      'contact_submissions',
      'ducted_estimate_submissions',
      'ductless_estimate_submissions',
      'landing_page_submissions',
    ] as const;

    const results = await Promise.all(
      tables.map((t) =>
        supabase
          .from(t as any)
          .select('id', { count: 'exact', head: true })
          .or('status.is.null,status.eq.new')
      )
    );

    // Equipment scans: only count those with email captured (actual leads)
    const scanRes = await supabase
      .from('equipment_scans' as any)
      .select('id', { count: 'exact', head: true })
      .not('email', 'is', null)
      .or('status.is.null,status.eq.new');

    const total =
      results.reduce((sum, r) => sum + (r.count || 0), 0) + (scanRes.count || 0);
    setCount(total);
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await fetchCount();
      if (!active) return;
    };
    run();

    const channel = freshChannel('new-submissions-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_submissions' }, fetchCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ducted_estimate_submissions' }, fetchCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ductless_estimate_submissions' }, fetchCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'landing_page_submissions' }, fetchCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_scans' }, fetchCount)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchCount]);

  return count;
}
