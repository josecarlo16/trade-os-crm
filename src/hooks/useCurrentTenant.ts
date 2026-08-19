import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useCurrentTenant = () => {
  const { user } = useAuth();
  const [tenantName, setTenantName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTenantName(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!roleRow?.tenant_id || cancelled) return;

      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', roleRow.tenant_id)
        .maybeSingle();

      if (!cancelled) setTenantName(tenant?.name ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return tenantName;
};
