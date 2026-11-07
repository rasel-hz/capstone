import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createApi } from '../server/api';
import { addBackHandler, apiUrl, pressBack } from '../src/services/native';

function call(method: string, url: string, headers: Record<string, string>, body = '') {
  const api = createApi({});
  const req = Object.assign(new EventEmitter(), { method, url, headers, socket: { remoteAddress: '127.0.0.1' } }) as unknown as IncomingMessage;
  const out: { status?: number; headers: Record<string, string>; body: string } = { headers: {}, body: '' };
  return new Promise<typeof out>((resolve) => {
    const res = {
      statusCode: 200,
      setHeader(k: string, v: string) { out.headers[k.toLowerCase()] = v; },
      end(this: { statusCode: number }, b = '') { out.status = this.statusCode; out.body = b; resolve(out); },
    } as unknown as ServerResponse;
    void api(req, res, () => resolve(out));
    setTimeout(() => { (req as unknown as EventEmitter).emit('data', Buffer.from(body)); (req as unknown as EventEmitter).emit('end'); });
  });
}

describe('server access for the installed app', () => {
  const crisis = JSON.stringify({ message: 'I want to die', context: { lang: 'en' } });
  const json = { 'content-type': 'application/json', host: 'localhost:8765' };

  it.each(['http://localhost', 'https://localhost', 'capacitor://localhost'])('allows the app origin %s', async (origin) => {
    const r = await call('POST', '/v1/chat/messages', { ...json, origin }, crisis);
    expect(r.status).toBe(200);
    expect(r.headers['access-control-allow-origin']).toBe(origin);
  });

  it('answers the browser preflight for the app only', async () => {
    const app = await call('OPTIONS', '/v1/chat/messages', { origin: 'http://localhost' });
    expect(app.status).toBe(204);
    expect(app.headers['access-control-allow-headers']).toBe('Content-Type');
    const other = await call('OPTIONS', '/v1/chat/messages', { origin: 'https://evil.example' });
    expect(other.status).toBe(403);
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('still rejects other websites', async () => {
    for (const origin of ['https://evil.example', 'http://localhost.evil.example', 'http://localhost:3000']) {
      const r = await call('POST', '/v1/chat/messages', { ...json, origin }, crisis);
      expect(r.status, origin).toBe(403);
      expect(r.headers['access-control-allow-origin'], origin).toBeUndefined();
    }
  });

  it('lets the app read the health check', async () => {
    const r = await call('GET', '/v1/health', { origin: 'http://localhost' });
    expect(r.status).toBe(200);
    expect(r.headers['access-control-allow-origin']).toBe('http://localhost');
    expect(JSON.parse(r.body)).toEqual({ ai: false });
  });
});

describe('server address', () => {
  it('stays relative on the web', () => {
    expect(apiUrl('/v1/health', false, '')).toBe('/v1/health');
  });
  it('uses this computer by default in the app, or a set address', () => {
    expect(apiUrl('/v1/health', true, '')).toBe('http://localhost:8765/v1/health');
    expect(apiUrl('/v1/health', true, 'https://api.example')).toBe('https://api.example/v1/health');
  });
});

describe('Android back button', () => {
  it('goes to the newest screen first, then falls back', () => {
    const log: string[] = [];
    const a = addBackHandler(() => log.push('player'));
    const b = addBackHandler(() => log.push('dialog'));
    pressBack(() => log.push('home'));
    b();
    pressBack(() => log.push('home'));
    a();
    pressBack(() => log.push('home'));
    expect(log).toEqual(['dialog', 'player', 'home']);
  });
});

describe('API key', () => {
  it('is never given a browser-visible name in the example settings', async () => {
    const { readFileSync } = await import('node:fs');
    const example = readFileSync('.env.example', 'utf8');
    expect(example).not.toMatch(/^VITE_.*KEY/m);
  });
});
