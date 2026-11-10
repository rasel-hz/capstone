import { describe, expect, it } from 'vitest';
import { defaultState, hydrate } from '../src/services/storage';
import { advance, beginItem, completeItem, createMission, exitMission, finishMission, hasOpenMission, pauseItem, resumeItem, settle, shouldOfferEasier, skipItem } from '../src/features/mission/engine';
import { generateMission, inPrayerWindow } from '../src/features/mission/planner';
import type { AppState } from '../src/types';
import { today } from '../src/utils';

const fresh = (o: Partial<AppState> = {}) => ({ ...defaultState(), ...o });
const three = [
  { id: 'mem', why: '', diff: 'normal' },
  { id: 'time', why: '', diff: 'normal' },
  { id: 'calm', why: '', diff: 'normal' },
] as const;

describe('XP integrity', () => {
  it('pays XP once for a completed item', () => {
    const s = fresh();
    createMission(s, [...three], false);
    beginItem(s);
    expect(completeItem(s, { acc: 100, retries: 0 })?.xp).toBe(25);
    expect(completeItem(s, { acc: 100, retries: 0 })).toBeNull();
    expect(s.xp).toBe(25);
    expect(s.hist).toHaveLength(1);
  });

  it('halves XP for a low score and pays full for unscored tasks', () => {
    const s = fresh();
    createMission(s, [...three], false);
    beginItem(s);
    completeItem(s, { acc: 40, retries: 0 });
    expect(s.xp).toBe(13);
    advance(s);
    beginItem(s);
    completeItem(s, { acc: null, retries: 0 });
    expect(s.xp).toBe(33);
  });

  it('gives no XP for skipping, and cannot overwrite a finished item', () => {
    const s = fresh();
    createMission(s, [...three], false);
    beginItem(s);
    skipItem(s);
    expect(s.xp).toBe(0);
    expect(s.mission!.items[0].status).toBe('SKIPPED');
    advance(s);
    beginItem(s);
    completeItem(s, { acc: null, retries: 0 });
    skipItem(s);
    expect(s.mission!.items[1].status).toBe('COMPLETED');
  });

  it('never replays a finished item after exit or refresh', () => {
    const s = fresh();
    createMission(s, [...three], false);
    beginItem(s);
    completeItem(s, { acc: 100, retries: 0 });
    exitMission(s);
    expect(s.mission!.idx).toBe(1);
    expect(s.mission!.status).toBe('PAUSED');
  });
});

describe('mission state', () => {
  it('reports a partial mission honestly', () => {
    const s = fresh();
    createMission(s, [...three], false);
    beginItem(s);
    completeItem(s, { acc: 100, retries: 0 });
    for (let i = 1; i < 3; i++) {
      advance(s);
      beginItem(s);
      skipItem(s);
    }
    advance(s);
    const r = finishMission(s);
    expect(r.all).toBe(false);
    expect(r.doneCount).toBe(1);
    expect(s.lastDaily?.all).toBe(false);
    // Finishing posts nothing in the chat; the attempts are saved and reach the companion as context.
    expect(s.chat).toHaveLength(0);
  });

  it('does not count a mission past its last item as open', () => {
    const s = fresh();
    createMission(s, [three[0]], true);
    beginItem(s);
    skipItem(s);
    advance(s);
    expect(hasOpenMission(s)).toBe(false);
  });

  it('closes a mission on load when every item already finished', () => {
    const s = fresh();
    createMission(s, [three[0]], false);
    beginItem(s);
    completeItem(s, { acc: 100, retries: 0 });
    settle(s);
    expect(s.mission!.status).toBe('DONE');
  });

  it('leaves paused time out of the duration', () => {
    const s = fresh();
    createMission(s, [three[0]], false);
    beginItem(s);
    const it = s.mission!.items[0];
    pauseItem(s);
    expect(it.status).toBe('PAUSED');
    it.pauseAt = Date.now() - 5000;
    it.start = Date.now() - 8000;
    resumeItem(s);
    completeItem(s, { acc: 100, retries: 0 });
    expect(s.hist[0].dur).toBe(3);
  });

  it('offers an easier next task only after real difficulty', () => {
    const base = { why: '', status: 'COMPLETED', xp: 0 } as const;
    const next = { ...base, id: 'time', diff: 'normal', retries: 0, acc: null } as const;
    expect(shouldOfferEasier({ ...base, id: 'mem', diff: 'normal', retries: 1, acc: 50 }, next)).toBe(true);
    expect(shouldOfferEasier({ ...base, id: 'mem', diff: 'normal', retries: 0, acc: 100 }, next)).toBe(false);
    expect(shouldOfferEasier({ ...base, id: 'mem', diff: 'normal', retries: 1, acc: 50 }, { ...next, id: 'calm' })).toBe(false);
  });
});

describe('planner', () => {
  it('uses confirmed context and low energy', () => {
    // Arranging the day comes in only with at least two open goals of the user's own.
    const s = fresh({ ctx: ['event'], pref: 'short', goals: { d: today(), items: [{ id: 'g1', text: 'Report', done: 0 }, { id: 'g2', text: 'Gym', done: 0 }] } });
    const m = generateMission(s);
    expect(m.map((i) => i.id)).toEqual(['video', 'seq', 'calm']);
    expect(generateMission(fresh({ ctx: ['event'], pref: 'short' })).map((i) => i.id)).toEqual(['video', 'mem', 'calm']);
    expect(m[0].diff).toBe('easy');
    expect(m[2].diff).toBe('normal');
  });

  it('respects the prayer window', () => {
    const s = fresh({ prayer: '12:00', pp: 30 });
    const at = (h: number, m: number) => new Date(2026, 0, 1, h, m);
    expect(inPrayerWindow(s, at(12, 10))).toBe(true);
    expect(inPrayerWindow(s, at(12, 40))).toBe(false);
    expect(inPrayerWindow({ ...s, pp: 0 }, at(12, 10))).toBe(false);
  });
});

describe('saved data', () => {
  it('keeps an old kw2 document and fills in missing fields', () => {
    const old = { started: 1, done: 1, name: 'فارس', xp: 120, hist: [], view: 'chat' } as Partial<AppState>;
    const s = hydrate(old);
    expect(s.name).toBe('فارس');
    expect(s.xp).toBe(120);
    expect(s.view).toBe('chat');
    expect(s.lastDaily).toBeNull();
    expect(s.pp).toBe(30);
  });

  it('flags a comeback after three days away', () => {
    const now = Date.now();
    const s = hydrate({ hist: [{ mid: 'm', id: 'mem', status: 'COMPLETED', acc: 1, retries: 0, xp: 1, dur: 1, d: '', ts: 1 }], last: now - 4 * 864e5 }, now);
    expect(s.comeback).toBe(1);
  });
});
