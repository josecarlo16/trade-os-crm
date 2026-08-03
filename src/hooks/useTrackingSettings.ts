import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrackingSetting {
  setting_key: string;
  setting_value: string | null;
  is_enabled: boolean;
}

export const useTrackingSettings = () => {
  return useQuery({
    queryKey: ['tracking-settings-public'],
    queryFn: async () => {
      // Use the security-definer RPC that exposes only the enabled
      // tracking IDs needed for runtime script injection. The table
      // itself is admin-only.
      const { data, error } = await supabase.rpc('get_public_tracking_settings');
      if (error) throw error;
      return (data ?? []) as TrackingSetting[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const getTrackingSetting = (
  settings: TrackingSetting[] | undefined,
  key: string
): TrackingSetting | undefined => {
  return settings?.find(s => s.setting_key === key);
};
