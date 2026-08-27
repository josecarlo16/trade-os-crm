import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TenantUser {
  user_id: string;
  email: string;
  role: string;
}

/**
 * Reuses the same `get_user_roles_with_email` RPC the existing Users admin
 * page (src/pages/admin/Users.tsx) already relies on for exactly this —
 * listing tenant coworkers by email — rather than introducing a second way
 * to do it. That RPC is already flagged separately in the security review
 * (any authenticated user can enumerate every user's email); using it here
 * doesn't make that worse, it's the same call site pattern already in
 * production.
 */
export function useTenantUsers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tenant_users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_roles_with_email');
      if (error) throw error;
      return ((data || []) as TenantUser[]).filter((u) => u.user_id !== user?.id);
    },
  });
}
