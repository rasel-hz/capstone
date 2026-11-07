import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkUsername, passwordLogin, type AuthDeps } from '../server/auth';
import { createApi } from '../server/api';
import { createStore } from '../src/context/AppStateContext';
import { claimForUser, loadForUser, stashAndReset } from '../src/features/auth/localAccount';
import { defaultState, type StateRepository } from '../src/services/storage';
import type { Profile } from '../src/services/auth';
import type { AppState } from '../src/types';

const users: Record<string, string> = { razan: 'razan@example.com' };
const base: AuthDeps = {
  supabaseUrl: 'https://proj.supabase.co',
  supabaseAnonKey: 'anon',
  findEmail: async (u) => users[u] ?? null,
  usernameTaken: async (u) => u in users,
};
const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: { status: number; code: string }) => `${e.status} ${e.code}`);

describe('username check', () => {
  it('rejects malformed usernames before touching the database', async () => {
    const taken = vi.fn();
    expect(await code(checkUsername({ username: 'a b' }, { ...base, usernameTaken: taken }))).toBe('400 invalid_username');
    expect(taken).not.toHaveBeenCalled();
  });
  it('is case-insensitive', async () => {
    expect(await checkUsername({ username: '  RaZaN ' }, base)).toEqual({ available: false });
    expect(await checkUsername({ username: 'new_user' }, base)).toEqual({ available: true });
  });
});

describe('username login', () => {
  it('returns only the session tokens, never the email or user record', async () => {
    const fetch = reply(200, { access_token: 'a', refresh_token: 'r', user: { email: 'razan@example.com' } });
    const out = await passwordLogin({ username: 'Razan', password: 'secret123' }, { ...base, fetch });
    expect(out).toEqual({ access_token: 'a', refresh_token: 'r' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://proj.supabase.co/auth/v1/token?grant_type=password');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'razan@example.com', password: 'secret123' });
  });
  it('gives an unknown username and a wrong password the same answer', async () => {
    const fetch = reply(400, { error_code: 'invalid_credentials' });
    expect(await code(passwordLogin({ username: 'nobody', password: 'x' }, { ...base, fetch }))).toBe('401 invalid_credentials');
    expect(fetch).not.toHaveBeenCalled();
    expect(await code(passwordLogin({ username: 'razan', password: 'wrong' }, { ...base, fetch }))).toBe('401 invalid_credentials');
  });
  it('treats malformed input as wrong credentials', async () => {
    const fetch = reply(200, {});
    for (const body of [{}, { username: 'razan' }, { username: 'r', password: 'x' }, { username: 'razan', password: 'x'.repeat(73) }]) {
      expect(await code(passwordLogin(body, { ...base, fetch }))).toBe('401 invalid_credentials');
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('passes on unconfirmed email and rate limits', async () => {
    expect(await code(passwordLogin({ username: 'razan', password: 'p' }, { ...base, fetch: reply(400, { error_code: 'email_not_confirmed' }) }))).toBe('403 email_not_confirmed');
    expect(await code(passwordLogin({ username: 'razan', password: 'p' }, { ...base, fetch: reply(429, {}) }))).toBe('429 rate_limited');
  });
  it('refuses to run without the Supabase settings', async () => {
    expect(await code(passwordLogin({ username: 'razan', password: 'p' }, { findEmail: base.findEmail }))).toBe('503 auth_not_configured');
  });
});

function call(api: ReturnType<typeof createApi>, path: string, init: { method?: string; origin?: string; body?: unknown; ip?: string } = {}) {
  const req = Readable.from(init.body === undefined ? [] : [Buffer.from(JSON.stringify(init.body))]) as unknown as IncomingMessage;
  Object.assign(req, {
    url: path, method: init.method ?? 'POST',
    headers: { host: 'localhost:8765', 'content-type': 'application/json', ...(init.origin ? { origin: init.origin } : {}) },
    socket: { remoteAddress: init.ip ?? '1.1.1.1' },
  });
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve) => {
    const res = { statusCode: 200, setHeader() {}, end(b?: string) { resolve({ status: this.statusCode, body: b ? JSON.parse(b) : {} }); } };
    void api(req, res as unknown as ServerResponse, () => resolve({ status: 404, body: {} }));
  });
}

describe('auth routes', () => {
  it('serves the two routes and blocks other sites', async () => {
    const api = createApi({ ...base, fetch: reply(200, { access_token: 'a', refresh_token: 'r' }) });
    expect(await call(api, '/v1/auth/username', { body: { username: 'razan' } })).toEqual({ status: 200, body: { available: false } });
    expect((await call(api, '/v1/auth/login', { body: { username: 'razan', password: 'p' } })).body).toEqual({ access_token: 'a', refresh_token: 'r' });
    expect((await call(api, '/v1/auth/login', { body: {}, origin: 'https://evil.example' })).status).toBe(403);
    expect((await call(api, '/v1/auth/login', { method: 'GET' })).status).toBe(405);
  });
  it('slows down repeated attempts from one address', async () => {
    const api = createApi({ ...base, fetch: reply(400, {}) });
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await call(api, '/v1/auth/login', { body: { username: 'razan', password: 'x' }, ip: '9.9.9.9' })).status);
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
});

describe('saved data per account on this device', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k),
    });
  });
  const repo = (): StateRepository => ({ load: () => JSON.parse(mem.get('kw2') ?? 'null'), save: (s) => void mem.set('kw2', JSON.stringify(s)), clear: () => void mem.delete('kw2') });
  const profile = (id: string, done = true): Profile => ({ id, username: id, firstName: id.toUpperCase(), addressForm: 'f', onboardingDone: done });
  const withProgress = (p: Partial<AppState>) => ({ ...defaultState(), started: 1, done: 1, xp: 70, hist: [{ mid: 'm', id: 'mem', status: 'COMPLETED', acc: 100, retries: 0, xp: 25, dur: 9, d: 'x', ts: 1 }], ...p }) as AppState;

  it('signing out keeps the progress for next time and shows a fresh start', () => {
    mem.set('kw2', JSON.stringify(withProgress({ uid: 'u1', lang: 'en' })));
    const store = createStore(repo());
    stashAndReset(store);
    expect(store.getState()).toMatchObject({ started: 0, done: 0, xp: 0, lang: 'en' });
    expect(store.getState().uid).toBeUndefined();
    loadForUser(store, profile('u1'), true);
    expect(store.getState()).toMatchObject({ uid: 'u1', xp: 70, done: 1, view: 'home', name: 'U1', g: 'f' });
    expect(mem.has('kw2:u:u1')).toBe(false);
  });
  it('never shows one account the other account\'s progress', () => {
    mem.set('kw2', JSON.stringify(withProgress({ uid: 'u1' })));
    const store = createStore(repo());
    loadForUser(store, profile('u2'), true);
    expect(store.getState()).toMatchObject({ uid: 'u2', xp: 0, hist: [], done: 1 });
    loadForUser(store, profile('u1'), true);
    expect(store.getState()).toMatchObject({ uid: 'u1', xp: 70 });
  });
  it('keeps unfinished onboarding unfinished, and data from before accounts is set aside, not lost', () => {
    mem.set('kw2', JSON.stringify(withProgress({})));
    const store = createStore(repo());
    loadForUser(store, profile('u3', false), false);
    expect(store.getState()).toMatchObject({ uid: 'u3', done: 0, started: 1 });
    expect(JSON.parse(mem.get('kw2:unclaimed')!).xp).toBe(70);
  });
  it('a new account keeps the answers given during onboarding', () => {
    mem.set('kw2', JSON.stringify({ ...defaultState(), started: 1, name: 'Sara' }));
    const store = createStore(repo());
    claimForUser(store, 'u4');
    expect(store.getState()).toMatchObject({ uid: 'u4', name: 'Sara' });
  });
});
