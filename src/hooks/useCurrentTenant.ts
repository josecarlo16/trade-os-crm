import { useEffect, useState } from 'react';
import { supabase, getCurrentTenantId } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UseCurrentTenantResult {
  tenantId: string | null;
  tenantName: string | null;
  isLoading: boolean;
}

export const useCurrentTenant = (): UseCurrentTenantResult => {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTenantId(null);
      setTenantName(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const id = await getCurrentTenantId();

      if (!id || cancelled) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      setTenantId(id);

      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', id)
        .maybeSingle();

      if (!cancelled) {
        setTenantName(tenant?.name ?? null);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { tenantId, tenantName, isLoading };
};
