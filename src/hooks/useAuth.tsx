import type { AuthError, Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { supabase } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  /** From the database's is_admin(). Only a convenience for the UI: RLS is the real check. */
  isAdmin: boolean;
  /** True until the stored session (and, when signed in, the admin check) has loaded. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  // The last admin check, tagged with the user it was for, so a stale answer is never used.
  const [adminCheck, setAdminCheck] = useState<{ userId: string; isAdmin: boolean } | null>(null);

  // Load the stored session, then follow sign-in and sign-out.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Do not call other supabase methods in here: supabase-js warns this can deadlock.
      setSession(next);
      setSessionLoaded(true);
      if (!next) setAdminCheck(null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // React Native has no page visibility events, so refresh tokens only while the app is
  // in the foreground, as Supabase recommends.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => subscription.remove();
  }, []);

  // Ask the database whether this user is an admin, whenever the user changes.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    // anon may not execute is_admin(), so this only runs when signed in.
    if (!userId) return;
    let active = true;
    supabase.rpc('is_admin').then(
      ({ data, error }) => {
        if (active) setAdminCheck({ userId, isAdmin: !error && data === true });
      },
      () => {
        if (active) setAdminCheck({ userId, isAdmin: false });
      },
    );
    return () => {
      active = false;
    };
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    // Local scope: sign out this device only.
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const checkedThisUser = userId !== null && adminCheck?.userId === userId;
  const isAdmin = checkedThisUser && adminCheck.isAdmin;
  const loading = !sessionLoaded || (userId !== null && !checkedThisUser);

  const value = useMemo<AuthContextValue>(
    () => ({ session, isAdmin, loading, signIn, signOut }),
    [session, isAdmin, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return value;
}
