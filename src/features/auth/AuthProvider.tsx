import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../../context/AppStateContext';
import * as auth from '../../services/auth';
import type { Profile, RegisterInput } from '../../services/auth';
import type { Gender } from '../../types';
import { claimForUser, loadForUser, stashAndReset } from './localAccount';
import { startProgressSync } from '../../services/progressSync';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthApi {
  status: Status;
  /** False when the Supabase settings are missing, so nobody can sign in. */
  configured: boolean;
  profile: Profile | null;
  /** First name for the welcome-back popup. Set only by an interactive sign-in, never on a reload. */
  welcome: string | null;
  register(v: RegisterInput): Promise<'created' | 'needsConfirmation'>;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  finishOnboarding(v: { firstName: string; addressForm: Gender }): Promise<void>;
  dismissWelcome(): void;
}

const Ctx = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const a = useContext(Ctx);
  if (!a) throw new Error('useAuth needs AuthProvider');
  return a;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);

  const signedOut = useCallback(() => {
    // Saved data that belongs to an account is put away, so it can't be seen without signing in.
    if (store.getState().uid) stashAndReset(store);
    setProfile(null);
    setWelcome(null);
    setStatus('signedOut');
  }, [store]);

  // Restore a saved session when the app opens. A session that can't be refreshed counts as signed out.
  useEffect(() => {
    const sb = auth.supabase;
    if (!sb) {
      signedOut();
      return;
    }
    let live = true;
    void (async () => {
      const { data } = await sb.auth.getSession();
      const uid = data.session?.user.id;
      if (!live) return;
      if (!uid) return signedOut();
      try {
        const p = await auth.fetchProfile(uid);
        if (!live) return;
        if (!p) {
          // An account without a Khowayk profile can't use the app. End the session.
          await sb.auth.signOut({ scope: 'local' });
          return signedOut();
        }
        loadForUser(store, p, false);
        setProfile(p);
        setStatus('signedIn');
      } catch (e) {
        if (!live) return;
        // Offline: keep using this device's copy if it belongs to the same account.
        const st = (e as { status?: number }).status;
        if (!st && store.getState().uid === uid) return setStatus('signedIn');
        await sb.auth.signOut({ scope: 'local' }).catch(() => {});
        signedOut();
      }
    })();
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      // Covers a session ended elsewhere, such as a refresh token that stopped working.
      if (event === 'SIGNED_OUT') setTimeout(signedOut, 0);
    });
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [store, signedOut]);

  // While signed in, progress is sent to Supabase as it happens, including history saved before.
  useEffect(() => (status === 'signedIn' ? startProgressSync(store) : undefined), [status, store]);

  const register = useCallback(async (v: RegisterInput) => {
    const r = await auth.register(v);
    if ('needsConfirmation' in r) return 'needsConfirmation' as const;
    claimForUser(store, r.profile.id);
    setProfile(r.profile);
    setStatus('signedIn');
    return 'created' as const;
  }, [store]);

  const login = useCallback(async (username: string, password: string) => {
    const p = await auth.login(username, password);
    loadForUser(store, p, true);
    setProfile(p);
    // The popup greets someone going straight to Home, not someone who still has onboarding to finish.
    if (p.onboardingDone) setWelcome(p.firstName);
    setStatus('signedIn');
  }, [store]);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      signedOut();
    }
  }, [signedOut]);

  const finishOnboarding = useCallback(async (v: { firstName: string; addressForm: Gender }) => {
    if (!profile) throw new auth.AuthError('saveFailed');
    setProfile(await auth.completeOnboarding(profile.id, v));
  }, [profile]);

  const dismissWelcome = useCallback(() => setWelcome(null), []);

  const api = useMemo<AuthApi>(() => ({
    status, configured: !!auth.supabase, profile, welcome, register, login, logout, finishOnboarding, dismissWelcome,
  }), [status, profile, welcome, register, login, logout, finishOnboarding, dismissWelcome]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
