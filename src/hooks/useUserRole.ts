import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'super_admin' | 'admin' | 'manager' | 'technician' | 'lead_tech' | 'installer' | 'helper';

const CACHE_KEY = 'cached_user_role';
const ROLE_FETCH_TIMEOUT_MS = 5000;

interface CachedRolePayload {
  userId: string;
  role: AppRole;
}

let roleCacheUserId: string | null = null;
let roleCacheValue: AppRole | null = null;
let inFlightRoleUserId: string | null = null;
let inFlightRoleRequest: Promise<AppRole | null> | null = null;

function getCachedRole(userId?: string): AppRole | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as CachedRolePayload;
    if (parsed && parsed.userId && parsed.role) {
      return !userId || parsed.userId === userId ? parsed.role : null;
    }
  } catch {}

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return cached as AppRole;
  } catch {}

  return null;
}

function setCachedRole(userId: string | null, role: AppRole | null) {
  try {
    if (role && userId) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ userId, role }));
    } else {
      sessionStorage.removeItem(CACHE_KEY);
    }
  } catch {}
}

function resetRoleCache() {
  roleCacheUserId = null;
  roleCacheValue = null;
  inFlightRoleUserId = null;
  inFlightRoleRequest = null;
  setCachedRole(null, null);
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

async function fetchRoleForUser(userId: string): Promise<AppRole | null> {
  if (roleCacheUserId === userId) {
    return roleCacheValue;
  }

  if (inFlightRoleUserId === userId && inFlightRoleRequest) {
    return inFlightRoleRequest;
  }

  inFlightRoleUserId = userId;
  inFlightRoleRequest = withTimeout(
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle(),
    ROLE_FETCH_TIMEOUT_MS,
    'Role lookup timed out'
  )
    .then(({ data, error }) => {
        if (error) throw error;
        return (data?.role ?? null) as AppRole | null;
      })
    .then((nextRole) => {
      roleCacheUserId = userId;
      roleCacheValue = nextRole;
      setCachedRole(userId, nextRole);
      return nextRole;
    })
    .catch((error) => {
      console.error('Error fetching user role:', error);
      roleCacheUserId = userId;
      roleCacheValue = null;
      setCachedRole(null, null);
      return null;
    })
    .finally(() => {
      if (inFlightRoleUserId === userId) {
        inFlightRoleUserId = null;
        inFlightRoleRequest = null;
      }
    });

  return inFlightRoleRequest;
}

interface UserRoleState {
  role: AppRole | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isTechnician: boolean;
  isLeadTech: boolean;
  isInstaller: boolean;
  isHelper: boolean;
  isFieldRole: boolean;
  hasAccess: boolean;
}

export const useUserRole = (): UserRoleState => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncRole = async () => {
      if (authLoading) return;

      if (!user) {
        resetRoleCache();
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      const cachedRole = getCachedRole(user.id);
      if (cachedRole) {
        roleCacheUserId = user.id;
        roleCacheValue = cachedRole;
        if (!cancelled) {
          setRole(cachedRole);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
      }

      const nextRole = await fetchRoleForUser(user.id);
      if (!cancelled) {
        setRole(nextRole);
        setLoading(false);
      }
    };

    void syncRole();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isManager = role === 'manager';
  const isTechnician = role === 'technician';
  const isLeadTech = role === 'lead_tech';
  const isInstaller = role === 'installer';
  const isHelper = role === 'helper';
  const isFieldRole = isTechnician || isLeadTech || isInstaller || isHelper;

  return {
    role,
    loading,
    isSuperAdmin,
    isAdmin,
    isManager,
    isTechnician,
    isLeadTech,
    isInstaller,
    isHelper,
    isFieldRole,
    hasAccess: isSuperAdmin || isAdmin || isManager || isFieldRole,
  };
};
