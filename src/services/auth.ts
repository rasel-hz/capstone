import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Gender } from '../types';
import { apiUrl } from './native';

// The project URL and anon key are public by design. Row Level Security protects the data, and
// privileged keys stay on the server. Without them the app can't sign anyone in, and says so.
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = URL_ && KEY
  ? createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'kw-auth' } })
  : null;

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
export const MIN_PASSWORD = 8;
export const normalizeUsername = (v: string) => v.trim().toLowerCase();
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export interface Profile {
  id: string;
  username: string;
  firstName: string;
  addressForm: Gender;
  onboardingDone: boolean;
}

/** A failure the screen can explain. The code maps to auth.errors.<code>. */
export class AuthError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function client(): SupabaseClient {
  if (!supabase) throw new AuthError('notConfigured');
  return supabase;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  } catch {
    throw new AuthError('network');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.ok) return data;
  const map: Record<string, string> = {
    invalid_credentials: 'invalidCredentials', email_not_confirmed: 'needsConfirmation', invalid_username: 'usernameFormat',
    slow_down: 'rateLimited', rate_limited: 'rateLimited', auth_not_configured: 'notConfigured',
  };
  throw new AuthError(map[data.error ?? ''] ?? 'generic');
}

type Row = { id: string; username: string; first_name: string; address_form: string; onboarding_completed_at: string | null };
const toProfile = (r: Row): Profile => ({
  id: r.id, username: r.username, firstName: r.first_name, addressForm: r.address_form === 'f' ? 'f' : 'm', onboardingDone: !!r.onboarding_completed_at,
});

/** The signed-in user's own profile. Row Level Security returns nothing for anyone else's. */
export async function fetchProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await client().from('profiles').select('id, username, first_name, address_form, onboarding_completed_at').eq('id', uid).maybeSingle();
  if (error) throw Object.assign(new AuthError('generic'), { status: (error as { status?: number }).status, cause: error });
  return data ? toProfile(data as Row) : null;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  addressForm: Gender;
}

export function validateRegister(v: RegisterInput): string | null {
  if (!USERNAME_RE.test(normalizeUsername(v.username))) return 'usernameFormat';
  if (!isEmail(v.email)) return 'emailFormat';
  if (v.password.length < MIN_PASSWORD) return 'passwordShort';
  return null;
}

/**
 * Creates the account with Supabase Auth. A database trigger creates the profile in the same step,
 * so the account and profile exist together or not at all. Returns the confirmed profile.
 */
export async function register(v: RegisterInput): Promise<{ profile: Profile } | { needsConfirmation: true }> {
  const invalid = validateRegister(v);
  if (invalid) throw new AuthError(invalid);
  const username = normalizeUsername(v.username);
  const { available } = await post<{ available: boolean }>('/v1/auth/username', { username });
  if (!available) throw new AuthError('usernameTaken');

  const { data, error } = await client().auth.signUp({
    email: v.email.trim(),
    password: v.password,
    options: { data: { username, first_name: v.firstName.trim(), address_form: v.addressForm } },
  });
  if (error) {
    const code = (error as { code?: string }).code ?? '';
    if (code === 'user_already_exists' || code === 'email_exists') throw new AuthError('emailTaken');
    if (code === 'weak_password') throw new AuthError('passwordShort');
    if (code.startsWith('over_') || error.status === 429) throw new AuthError('rateLimited');
    // The trigger rejects a username taken a moment ago, which Supabase reports as a database error.
    if (error.status === 500) {
      const again = await post<{ available: boolean }>('/v1/auth/username', { username }).catch(() => ({ available: true }));
      if (!again.available) throw new AuthError('usernameTaken');
    }
    throw new AuthError(error.message?.toLowerCase().includes('fetch') ? 'network' : 'generic');
  }
  // With email confirmation turned on, Supabase creates the account but doesn't sign in yet.
  if (!data.session || !data.user) return { needsConfirmation: true };
  const profile = await fetchProfile(data.user.id);
  if (!profile) throw new AuthError('generic');
  return { profile };
}

export async function login(username: string, password: string): Promise<Profile> {
  const u = normalizeUsername(username);
  if (!u || !password) throw new AuthError('invalidCredentials');
  const tokens = await post<{ access_token: string; refresh_token: string }>('/v1/auth/login', { username: u, password });
  const { data, error } = await client().auth.setSession(tokens);
  if (error || !data.user) throw new AuthError('generic');
  const profile = await fetchProfile(data.user.id);
  if (!profile) throw new AuthError('generic');
  return profile;
}

export async function logout() {
  // Ends this device's session. A network failure still removes the session stored on the device.
  await client().auth.signOut({ scope: 'local' });
}

export async function completeOnboarding(uid: string, v: { firstName: string; addressForm: Gender }): Promise<Profile> {
  const { data, error } = await client().from('profiles')
    .update({ first_name: v.firstName.trim(), address_form: v.addressForm, onboarding_completed_at: new Date().toISOString() })
    .eq('id', uid).select('id, username, first_name, address_form, onboarding_completed_at').single();
  if (error || !data) throw new AuthError('saveFailed');
  return toProfile(data as Row);
}
