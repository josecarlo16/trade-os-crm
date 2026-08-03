import { useSyncExternalStore } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AUTH_INIT_TIMEOUT_MS = 5000;

const INITIAL_AUTH_STATE: AuthState = {
  user: null,
  session: null,
  loading: true,
};

let authState: AuthState = INITIAL_AUTH_STATE;
let initialized = false;
let authTimeout: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

const clearSessionCaches = () => {
  try {
    sessionStorage.removeItem('cached_user_role');
    sessionStorage.removeItem('cached_permissions');
  } catch {}
};

const setAuthState = (session: Session | null) => {
  authState = {
    session,
    user: session?.user ?? null,
    loading: false,
  };

  if (!session?.user) {
    clearSessionCaches();
  }

  notifySubscribers();
};

const initializeAuth = () => {
  if (initialized) return;

  initialized = true;
  let resolved = false;

  const finish = (session: Session | null) => {
    resolved = true;

    if (authTimeout) {
      clearTimeout(authTimeout);
      authTimeout = null;
    }

    setAuthState(session);
  };

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => finish(session));

  supabase.auth
    .getSession()
    .then(({ data: { session } }) => finish(session))
    .catch((err) => {
      console.error('getSession failed, clearing auth:', err);
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith('sb-') && key.includes('-auth-token'))
          .forEach((key) => localStorage.removeItem(key));
      } catch {}
      finish(null);
    });

  authTimeout = setTimeout(() => {
    if (!resolved) {
      console.warn('Auth init timed out after 5s — proceeding as signed out');
      finish(null);
    }
  }, AUTH_INIT_TIMEOUT_MS);

  void subscription;
};

const subscribe = (callback: () => void) => {
  initializeAuth();
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
  };
};

const getSnapshot = () => authState;

const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { error };
};

const signUp = async (email: string, password: string, fullName?: string) => {
  const redirectUrl = `${window.location.origin}/admin`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
      },
    },
  });
  return { error };
};

const signOut = async () => {
  clearSessionCaches();
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const useAuth = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    signIn,
    signUp,
    signOut,
  };
};
