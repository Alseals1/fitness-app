import type { AuthError, Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  adminCheckResult,
  adminStatus as toAdminStatus,
  shouldRecheckAdmin,
  type AdminCheck,
  type AdminCheckResult,
  type AdminStatus,
} from '../lib/adminCheck';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  /** From the database's is_admin(). Only a convenience for the UI: RLS is the real check. */
  isAdmin: boolean;
  /** The last admin check for this user. `failed` means the check could not run, not that the user is no admin. */
  adminStatus: AdminStatus;
  /** Runs the admin check again, for example after a network error. */
  recheckAdmin: () => Promise<void>;
  /** True until the stored session (and, when signed in, the first admin check) has loaded. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  /** Creates a business account. `needsConfirmation` is true when the server wants the email confirmed first. */
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  // The last admin check, tagged with the user it was for, so a stale answer is never used.
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  // Numbers each admin check. Only the newest one may set the answer.
  const latestCheck = useRef(0);

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

  // Ask the database whether this user is an admin. An error (for example no network) is kept as
  // `failed`, never as "not an admin", so it can be retried.
  const runAdminCheck = useCallback(async (forUserId: string) => {
    const id = ++latestCheck.current;
    let result: AdminCheckResult;
    try {
      const { data, error } = await supabase.rpc('is_admin');
      result = adminCheckResult(data, error);
    } catch {
      result = 'failed';
    }
    if (latestCheck.current === id) setAdminCheck({ userId: forUserId, result });
  }, []);

  // Check whenever the user changes.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    // anon may not execute is_admin(), so this only runs when signed in.
    if (!userId) return;
    void runAdminCheck(userId);
    return () => {
      // Discard an answer still on its way for a user who has since signed out or changed.
      latestCheck.current += 1;
    };
  }, [userId, runAdminCheck]);

  const adminStatus = toAdminStatus(userId, adminCheck);

  // After a failed check, try again each time the app returns to the foreground.
  useEffect(() => {
    if (!userId || adminStatus !== 'failed') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (shouldRecheckAdmin(state, adminStatus)) void runAdminCheck(userId);
    });
    return () => subscription.remove();
  }, [userId, adminStatus, runAdminCheck]);

  const recheckAdmin = useCallback(
    () => (userId ? runAdminCheck(userId) : Promise.resolve()),
    [userId, runAdminCheck],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { error, needsConfirmation: !error && !data.session };
  }, []);

  const signOut = useCallback(async () => {
    // Local scope: sign out this device only.
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const isAdmin = adminStatus === 'admin';
  // A retry keeps the last answer until the new one arrives, so `loading` never comes back on.
  const loading = !sessionLoaded || adminStatus === 'checking';

  const value = useMemo<AuthContextValue>(
    () => ({ session, isAdmin, adminStatus, recheckAdmin, loading, signIn, signUp, signOut }),
    [session, isAdmin, adminStatus, recheckAdmin, loading, signIn, signUp, signOut],
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
