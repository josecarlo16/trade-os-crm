import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useOpenSeoActions() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      const { count: c } = await supabase
        .from('seo_report_actions' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      if (active) setCount(c || 0);
    };
    fetchCount();
    const channel = supabase
      .channel('seo-actions-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seo_report_actions' }, fetchCount)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  return count;
}
