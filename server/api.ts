import type { IncomingMessage, ServerResponse } from 'node:http';
import { ChatError, handleChat, type ChatDeps } from './chat.ts';

const MAX_BODY = 32 * 1024;
const RATE_LIMIT = 20;
const WINDOW_MS = 60000;

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

// A page on another site can't use this server to spend the key.
function sameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function createApi(deps: ChatDeps) {
  const hits = new Map<string, number[]>();

  function limited(req: IncomingMessage) {
    const ip = req.socket.remoteAddress ?? 'local';
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length > RATE_LIMIT;
  }

  return async function api(req: IncomingMessage, res: ServerResponse, next: Next) {
    const path = (req.url ?? '').split('?')[0];
    if (path === '/v1/health' && req.method === 'GET') return send(res, 200, { ai: !!deps.apiKey });
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

export const depsFromEnv = (env: Record<string, string | undefined>): ChatDeps => ({
  apiKey: env.OPENAI_API_KEY?.trim() || undefined,
  model: env.OPENAI_MODEL?.trim() || undefined,
  baseUrl: env.OPENAI_BASE_URL?.trim() || undefined,
});
