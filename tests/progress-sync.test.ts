import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt } from '../src/types';

// A fake Supabase client that records RPC calls and returns scripted answers. Unit tests only:
// the real database rules are tested against Supabase itself.
const calls: { fn: string; args: Record<string, unknown> }[] = [];
let answer: (fn: string, args: Record<string, unknown>) => { data: unknown; error: { message: string; code?: string } | null } = () => ({ data: { awarded: 0 }, error: null });
let rows: { attempts: unknown[]; events: unknown[] } = { attempts: [], events: [] };

vi.mock('../src/services/auth', () => {
  const query = (table: string) => {
    const result = { data: table === 'challenge_attempts' ? rows.attempts : rows.events, error: null };
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'not', 'order', 'limit']) q[m] = () => q;
    q.then = (res: (v: unknown) => void) => res(result);
    return q;
  };
  return {
    supabase: {
      rpc: async (fn: string, args: Record<string, unknown>) => { calls.push({ fn, args }); return answer(fn, args); },
      from: query,
    },
  };
});

const { createStore } = await import('../src/context/AppStateContext');
const { defaultState } = await import('../src/services/storage');
const { syncNow, startProgressSync, fetchProgress, claimDailyBonusAfterSync } = await import('../src/services/progressSync');

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });

const row = (p: Partial<Attempt>): Attempt => ({ mid: 'm1', id: 'video', status: 'COMPLETED', acc: 100, retries: 0, xp: 30, dur: 40, d: 'x', ts: 1_800_000_000_000, ...p });
function setup(hist: Attempt[], extra: Record<string, unknown> = {}) {
  mem.clear();
  mem.set('kw2', JSON.stringify({ ...defaultState(), started: 1, done: 1, uid: 'u1', hist, ...extra }));
  const store = createStore({ load: () => JSON.parse(mem.get('kw2')!), save: (s) => void mem.set('kw2', JSON.stringify(s)), clear: () => {} });
  const stop = startProgressSync(store);
  return { store, stop };
}

beforeEach(() => {
  calls.length = 0;
  answer = () => ({ data: { awarded: 0 }, error: null });
});

describe('progress sync', () => {
  it('sends each finished attempt once, with the key the server saw at the start', async () => {
    const { store, stop } = setup([row({ i: 0 }), row({ i: 1, id: 'mem', status: 'SKIPPED', acc: null, xp: 0, ts: 1_800_000_000_500 })]);
    await syncNow();
    const finishes = calls.filter((c) => c.fn === 'finish_challenge_attempt');
    expect(finishes.map((c) => [c.args.p_attempt_key, c.args.p_status])).toEqual([['m1:0', 'completed'], ['m1:1', 'skipped']]);
    expect(finishes[0].args).toMatchObject({ p_accuracy: 100, p_xp: 30, p_duration_sec: 40, p_occurred_at: new Date(1_800_000_000_000).toISOString() });
    expect(store.getState().hist.every((h) => h.sy === 1)).toBe(true);
    calls.length = 0;
    await syncNow();
    expect(calls.filter((c) => c.fn === 'finish_challenge_attempt')).toHaveLength(0);
    stop();
  });

  it('uploads history from before once, as an import, and never through the finish call that awards points', async () => {
    const { store, stop } = setup([row({}), row({ ts: 1_800_000_001_000, id: 'calm', acc: null })]);
    await syncNow();
    expect(calls.filter((c) => c.fn === 'finish_challenge_attempt')).toHaveLength(0);
    const imp = calls.filter((c) => c.fn === 'import_challenge_history');
    expect(imp).toHaveLength(1);
    expect((imp[0].args.p_rows as { key: string }[]).map((r) => r.key)).toEqual(['imp:m1:1800000000000:video', 'imp:m1:1800000001000:calm']);
    calls.length = 0;
    await syncNow();
    expect(calls.filter((c) => c.fn === 'import_challenge_history')).toHaveLength(0);
    expect(store.getState().hist.every((h) => h.sy === 1)).toBe(true);
    stop();
  });

  it('keeps an attempt unsent after a network failure, and sends it next time', async () => {
    answer = (fn) => (fn === 'finish_challenge_attempt' ? { data: null, error: { message: 'TypeError: Failed to fetch' } } : { data: null, error: null });
    const { store, stop } = setup([row({ i: 0 })]);
    await syncNow();
    expect(store.getState().hist[0].sy).toBeUndefined();
    answer = () => ({ data: { awarded: 10 }, error: null });
    await syncNow();
    expect(store.getState().hist[0].sy).toBe(1);
    stop();
  });

  it('does not retry an attempt the server refused', async () => {
    answer = (fn) => (fn === 'finish_challenge_attempt' ? { data: null, error: { message: 'invalid_status', code: '22023' } } : { data: null, error: null });
    const { store, stop } = setup([row({ i: 0 })]);
    await syncNow();
    expect(store.getState().hist[0].sy).toBe(1);
    stop();
  });

  it('sends energy check-ins, full days and finished journeys once each', async () => {
    const { stop } = setup([], { en: [{ d: 'Sat Nov 07 2026', e: 'mid', ts: 1 }], fullDays: ['Sat Nov 07 2026'], progDone: [{ id: 'anx', before: 2, after: 4, end: 'Sat Nov 07 2026' }] });
    await syncNow();
    expect(calls.filter((c) => c.fn === 'record_progress_event').map((c) => [c.args.p_kind, c.args.p_key])).toEqual([
      ['energy', 'Sat Nov 07 2026'], ['full_day', 'Sat Nov 07 2026'], ['program', 'anx:Sat Nov 07 2026'],
    ]);
    calls.length = 0;
    await syncNow();
    expect(calls.filter((c) => c.fn === 'record_progress_event')).toHaveLength(0);
    stop();
  });

  it('claims the daily bonus only after the mission results are sent', async () => {
    const { stop } = setup([row({ i: 0 }), row({ i: 1 }), row({ i: 2 })]);
    await claimDailyBonusAfterSync('m1');
    const order = calls.map((c) => c.fn);
    expect(order.lastIndexOf('finish_challenge_attempt')).toBeLessThan(order.indexOf('claim_daily_mission_bonus'));
    stop();
  });

  it('builds the progress page data from Supabase rows only', async () => {
    rows = {
      attempts: [
        { attempt_key: 'm1:0', mission_key: 'm1', challenge_id: 'video', status: 'completed', accuracy: 67, retries: 1, duration_sec: 42, xp: 30, result: null, finished_at: '2026-11-07T10:00:00Z' },
        { attempt_key: 'm1:1', mission_key: 'm1', challenge_id: 'mem', status: 'skipped', accuracy: null, retries: 0, duration_sec: 5, xp: 0, result: null, finished_at: '2026-11-07T10:05:00Z' },
        { attempt_key: 'x:0', mission_key: 'x', challenge_id: 'not_a_game', status: 'completed', accuracy: null, retries: 0, duration_sec: 5, xp: 10, result: null, finished_at: '2026-11-07T10:06:00Z' },
      ],
      events: [
        { kind: 'energy', event_key: 'Sat Nov 07 2026', value: { e: 'low' }, occurred_at: '2026-11-07T08:00:00Z' },
        { kind: 'full_day', event_key: 'Sat Nov 07 2026', value: {}, occurred_at: '2026-11-07T20:00:00Z' },
        { kind: 'program', event_key: 'anx:Sat Nov 07 2026', value: { id: 'anx', before: 2, after: 4, end: 'Sat Nov 07 2026' }, occurred_at: '2026-11-07T20:00:00Z' },
      ],
    };
    const p = await fetchProgress();
    expect(p.hist.map((h) => [h.id, h.status, h.acc])).toEqual([['video', 'COMPLETED', 67], ['mem', 'SKIPPED', null]]);
    expect(p.xp).toBe(30);
    expect(p.en).toEqual([{ d: 'Sat Nov 07 2026', e: 'low', ts: Date.parse('2026-11-07T08:00:00Z') }]);
    expect(p.fullDays).toEqual(['Sat Nov 07 2026']);
    expect(p.progDone).toEqual([{ id: 'anx', before: 2, after: 4, end: 'Sat Nov 07 2026' }]);
  });
});
