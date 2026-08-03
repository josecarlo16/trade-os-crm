import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

const CACHE_KEY = 'cached_permissions';
const PERMISSIONS_FETCH_TIMEOUT_MS = 5000;

function getCachedPermissions(): Set<string> | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return new Set(JSON.parse(cached) as string[]);
  } catch {}
  return null;
}

function setCachedPermissions(perms: Set<string>) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify([...perms]));
  } catch {}
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

interface UseRolePermissionsResult {
  permissions: Set<string>;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useRolePermissions = (): UseRolePermissionsResult => {
  const cachedPermissions = getCachedPermissions();
  const [permissions, setPermissions] = useState<Set<string>>(cachedPermissions ?? new Set());
  const [loading, setLoading] = useState(!cachedPermissions);
  const { role, isSuperAdmin, loading: roleLoading } = useUserRole();

  const fetchPermissions = async () => {
    if (isSuperAdmin) {
      const perms = new Set(['*']);
      setPermissions(perms);
      setCachedPermissions(perms);
      setLoading(false);
      return;
    }

    if (roleLoading) return;

    if (!role) {
      const emptyPermissions = new Set<string>();
      setPermissions(emptyPermissions);
      setCachedPermissions(emptyPermissions);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('role_permissions')
          .select('permission_key, enabled')
          .eq('role', role)
          .eq('enabled', true),
        PERMISSIONS_FETCH_TIMEOUT_MS,
        'Permission lookup timed out'
      );

      if (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(new Set());
        return;
      }

      const enabledPermissions = new Set<string>(
        data?.map((permission) => permission.permission_key) || []
      );
      setPermissions(enabledPermissions);
      setCachedPermissions(enabledPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPermissions();
  }, [role, isSuperAdmin, roleLoading]);

  return {
    permissions,
    loading: loading || roleLoading,
    refetch: fetchPermissions,
  };
};

// Utility to check if user has a specific permission
export const hasPermission = (
  permissions: Set<string>,
  permissionKey: string,
  isSuperAdmin: boolean
): boolean => {
  if (isSuperAdmin || permissions.has('*')) return true;
  return permissions.has(permissionKey);
};
