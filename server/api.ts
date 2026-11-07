import type { IncomingMessage, ServerResponse } from 'node:http';
import { checkUsername, passwordLogin, type AuthDeps } from './auth.ts';
import { ChatError, handleChat, type ChatDeps } from './chat.ts';

const MAX_BODY = 32 * 1024;
const RATE_LIMIT = 20;
const WINDOW_MS = 60000;
// Sign-in and username checks get a tighter limit, to slow down password guessing.
const AUTH_LIMIT = 10;
const AUTH_ROUTES: Record<string, (body: unknown, deps: AuthDeps) => Promise<unknown>> = {
  '/v1/auth/login': passwordLogin,
  '/v1/auth/username': checkUsername,
};

type Next = () => void;

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      // Keeps reading without storing, so the client still receives the 413 response.
      if (size > MAX_BODY) reject(new ChatError(413, 'too_large'));
      else parts.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
    req.on('error', reject);
  });
}

// The installed Android and iOS apps load from these addresses, which no website on the internet can use.
const APP_ORIGINS = ['http://localhost', 'https://localhost', 'capacitor://localhost'];
const isApp = (req: IncomingMessage) => APP_ORIGINS.includes(req.headers.origin ?? '');

// A page on another site can't use this server to spend the key.
function sameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (isApp(req)) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function createApi(deps: ChatDeps & AuthDeps) {
  const hits = new Map<string, number[]>();
  const authHits = new Map<string, number[]>();

  function limited(req: IncomingMessage, map = hits, max = RATE_LIMIT) {
    const ip = req.socket.remoteAddress ?? 'local';
    const now = Date.now();
    const recent = (map.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    map.set(ip, recent);
    return recent.length > max;
  }

  return async function api(req: IncomingMessage, res: ServerResponse, next: Next) {
    const path = (req.url ?? '').split('?')[0];
    if (path.startsWith('/v1/') && isApp(req)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin as string);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (path.startsWith('/v1/') && req.method === 'OPTIONS') {
      res.statusCode = isApp(req) ? 204 : 403;
      res.end();
      return;
    }
    if (path === '/v1/health' && req.method === 'GET') return send(res, 200, { ai: !!deps.apiKey });
    const auth = AUTH_ROUTES[path];
    if (auth) {
      if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
      if (!sameOrigin(req)) return send(res, 403, { error: 'forbidden' });
      if (!(req.headers['content-type'] ?? '').includes('application/json')) return send(res, 415, { error: 'json_required' });
      if (limited(req, authHits, AUTH_LIMIT)) return send(res, 429, { error: 'slow_down' });
      try {
        return send(res, 200, await auth(JSON.parse(await readBody(req)), deps));
      } catch (e) {
        if (e instanceof ChatError) return send(res, e.status, { error: e.code });
        if (e instanceof SyntaxError) return send(res, 400, { error: 'invalid_json' });
        console.error('Auth request failed');
        return send(res, 500, { error: 'server_error' });
      }
    }
    if (path !== '/v1/chat/messages') return next();
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
    if (!sameOrigin(req)) return send(res, 403, { error: 'forbidden' });
    if (!(req.headers['content-type'] ?? '').includes('application/json')) return send(res, 415, { error: 'json_required' });
    if (limited(req)) return send(res, 429, { error: 'slow_down' });
    try {
      send(res, 200, await handleChat(JSON.parse(await readBody(req)), deps));
    } catch (e) {
      if (e instanceof ChatError) return send(res, e.status, { error: e.code });
      if (e instanceof SyntaxError) return send(res, 400, { error: 'invalid_json' });
      console.error('Chat request failed');
      send(res, 500, { error: 'server_error' });
    }
  };
}

export const depsFromEnv = (env: Record<string, string | undefined>): ChatDeps & AuthDeps => ({
  apiKey: env.OPENAI_API_KEY?.trim() || undefined,
  model: env.OPENAI_MODEL?.trim() || undefined,
  baseUrl: env.OPENAI_BASE_URL?.trim() || undefined,
  // The project URL and anon key are public by design; the browser uses the same two values.
  supabaseUrl: (env.VITE_SUPABASE_URL || env.SUPABASE_URL)?.trim() || undefined,
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY)?.trim() || undefined,
  // Server only. Never give this a VITE_ prefix.
  databaseUrl: (env.DATABASE_URL || env.DataBase_URL)?.trim() || undefined,
});
