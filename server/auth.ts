// Username login for Supabase Auth. Supabase signs people in by email, so the server finds the account's email
// from its username and signs in on the user's behalf. The email never leaves the server, and every failure
// returns the same answer, so this can't be used to look up someone's email.
import postgres from 'postgres';
import { ChatError } from './chat.ts';

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
// Supabase hashes passwords with bcrypt, which reads at most 72 bytes.
const MAX_PASSWORD = 72;
const AUTH_TIMEOUT_MS = 10000;

export interface AuthDeps {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  databaseUrl?: string;
  fetch?: typeof fetch;
  /** Replaceable in tests. Defaults to a query on the Supabase database. */
  findEmail?(username: string): Promise<string | null>;
  usernameTaken?(username: string): Promise<boolean>;
}

let sql: ReturnType<typeof postgres> | null = null;
function db(deps: AuthDeps) {
  if (!deps.databaseUrl) throw new ChatError(503, 'auth_not_configured');
  // prepare: false also works with Supabase's transaction pooler, if the connection string is switched to it.
  // A short connect timeout, so a database that can't be reached gives a clear "service unreachable" answer
  // well before the browser gives up. Otherwise a wrong password could surface as a connection error.
  sql ??= postgres(deps.databaseUrl, { ssl: 'require', max: 3, idle_timeout: 30, connect_timeout: 8, prepare: false, onnotice: () => {} });
  return sql;
}

const findEmail = async (deps: AuthDeps, username: string) => {
  if (deps.findEmail) return deps.findEmail(username);
  try {
    const rows = await db(deps)`select u.email from public.profiles p join auth.users u on u.id = p.id where p.username = ${username} limit 1`;
    return (rows[0]?.email as string | undefined) ?? null;
  } catch (e) {
    if (e instanceof ChatError) throw e;
    // The lookup itself failed: that's the service, not the user's credentials. Logs the type only.
    console.error(`Username lookup failed: ${(e as Error).name}`);
    throw new ChatError(503, 'auth_unreachable');
  }
};

const usernameTaken = async (deps: AuthDeps, username: string) => {
  if (deps.usernameTaken) return deps.usernameTaken(username);
  const rows = await db(deps)`select 1 from public.profiles where username = ${username} limit 1`;
  return rows.length > 0;
};

export const normalizeUsername = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export async function checkUsername(raw: unknown, deps: AuthDeps): Promise<{ available: boolean }> {
  const username = normalizeUsername((raw as { username?: unknown } | null)?.username);
  if (!USERNAME_RE.test(username)) throw new ChatError(400, 'invalid_username');
  return { available: !(await usernameTaken(deps, username)) };
}

export interface LoginTokens {
  access_token: string;
  refresh_token: string;
}

export async function passwordLogin(raw: unknown, deps: AuthDeps): Promise<LoginTokens> {
  if (!deps.supabaseUrl || !deps.supabaseAnonKey) throw new ChatError(503, 'auth_not_configured');
  const b = (raw ?? {}) as { username?: unknown; password?: unknown };
  const username = normalizeUsername(b.username);
  const password = typeof b.password === 'string' ? b.password : '';
  // Malformed input gets the same answer as a wrong password.
  if (!USERNAME_RE.test(username) || !password || new TextEncoder().encode(password).length > MAX_PASSWORD) {
    throw new ChatError(401, 'invalid_credentials');
  }
  const email = await findEmail(deps, username);
  if (!email) throw new ChatError(401, 'invalid_credentials');

  let res: Response;
  try {
    res = await (deps.fetch ?? fetch)(`${deps.supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: deps.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch (e) {
    // Logs the failure type only. Never the username, email or password.
    console.error(`Supabase sign-in failed: ${(e as Error).name}`);
    throw new ChatError(504, 'auth_unreachable');
  }
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; error_code?: string };
  if (res.ok && data.access_token && data.refresh_token) return { access_token: data.access_token, refresh_token: data.refresh_token };
  if (res.status === 429) throw new ChatError(429, 'rate_limited');
  if (data.error_code === 'email_not_confirmed') throw new ChatError(403, 'email_not_confirmed');
  if (res.status === 400 || res.status === 401) throw new ChatError(401, 'invalid_credentials');
  console.error(`Supabase sign-in failed with status ${res.status}`);
  throw new ChatError(502, 'auth_failed');
}
