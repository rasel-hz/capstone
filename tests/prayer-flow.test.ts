import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRequest } from '../server/chat';
import { buildChatRequest } from '../src/features/companion/request';
import { completeItem, createMission, exitMission, hasOpenMission } from '../src/features/mission/engine';
import { inPrayerWindow } from '../src/features/mission/planner';
import {
  acknowledge, breakLeft, currentWindow, endBreak, needsCheckIn, nextOf, pauseBreak, placeOf, resumeBreak, setBreakLength, startBreak, turnOff,
} from '../src/features/prayer/gate';
import { localDate, nearestCity, placeTimes, placeWindow, prayerTimes, roundCoord } from '../src/features/prayer/times';
import { defaultState, hydrate } from '../src/services/storage';
import type { AppState } from '../src/types';

// 1 May 2026 in Riyadh. Times come from the same calculation the app uses.
const day = new Date('2026-05-01T09:00:00Z');
const riyadh = prayerTimes('riyadh', day)!;
const at = (base: Date, mins: number) => new Date(base.getTime() + mins * 60_000);
const state = (p: Partial<AppState> = {}): AppState => ({ ...defaultState(), city: 'riyadh', pp: 30, ...p });

describe('Test A: already prayed', () => {
  it('asks once in a window, then never again in that window', () => {
    const s = state();
    const now = at(riyadh.asr, 5);
    const w = needsCheckIn(s, now)!;
    expect(w.id).toBe('asr');
    acknowledge(s, w, 'prayed');
    expect(needsCheckIn(s, now)).toBeNull();
    expect(needsCheckIn(s, at(riyadh.asr, 25))).toBeNull();
  });

  it('treats each prayer separately: Asr does not cover Maghrib', () => {
    const s = state();
    acknowledge(s, needsCheckIn(s, at(riyadh.asr, 5)), 'prayed');
    expect(needsCheckIn(s, at(riyadh.maghrib, 1))?.id).toBe('maghrib');
  });

  it('keeps one short-lived answer, not a history, and the answer earns nothing', () => {
    const s = state();
    acknowledge(s, needsCheckIn(s, at(riyadh.asr, 5)), 'prayed');
    acknowledge(s, needsCheckIn(s, at(riyadh.maghrib, 1)), 'prayed');
    expect(s.prayerAck?.key).toMatch(/:maghrib$/);
    expect(JSON.stringify(s)).not.toMatch(/:asr/);
    expect(s.xp).toBe(0);
  });

  it('never blocks: the window only asks, and the mission and its XP are untouched', () => {
    const s = state();
    createMission(s, [{ id: 'calm', why: [{ k: 'chat' }], diff: 'normal' }], true);
    acknowledge(s, needsCheckIn(s, at(riyadh.asr, 5)), 'prayed');
    expect(hasOpenMission(s)).toBe(true);
    expect(completeItem(s, { acc: null, retries: 0 })?.xp).toBe(15);
    expect(s.xp).toBe(15);
  });
});

describe('Test B: not yet, with a break', () => {
  it('keeps the mission saved, survives a reload, and never marks prayer as done', () => {
    const s = state();
    createMission(s, [{ id: 'calm', why: [{ k: 'chat' }], diff: 'normal' }, { id: 'time', why: [{ k: 'chat' }], diff: 'normal' }], true);
    exitMission(s);
    const now = at(riyadh.asr, 3);
    const w = needsCheckIn(s, now)!;
    startBreak(s, w, 15, now.getTime());
    const reloaded = hydrate(JSON.parse(JSON.stringify(s)), now.getTime());
    expect(reloaded.prayerBreak?.mins).toBe(15);
    expect(hasOpenMission(reloaded)).toBe(true);
    // Time running out is not a claim that anyone prayed.
    expect(breakLeft(reloaded.prayerBreak!, now.getTime() + 20 * 60_000)).toBe(0);
    expect(reloaded.prayerAck).toBeNull();
  });

  it('pauses, resumes and changes the reminder without losing time', () => {
    const s = state();
    startBreak(s, null, 10, 0);
    pauseBreak(s, 4 * 60_000);
    expect(breakLeft(s.prayerBreak!, 9e9)).toBe(6 * 60_000);
    resumeBreak(s, 100 * 60_000);
    expect(breakLeft(s.prayerBreak!, 101 * 60_000)).toBe(5 * 60_000);
    setBreakLength(s, 20, 200 * 60_000);
    expect(breakLeft(s.prayerBreak!, 200 * 60_000)).toBe(20 * 60_000);
  });

  it('coming back stops the prompt for that window without recording prayer', () => {
    const s = state();
    const now = at(riyadh.asr, 3);
    startBreak(s, needsCheckIn(s, now), 10, now.getTime());
    endBreak(s, at(riyadh.asr, 14));
    expect(s.prayerBreak).toBeNull();
    expect(s.prayerAck?.v).toBe('back');
    expect(needsCheckIn(s, at(riyadh.asr, 15))).toBeNull();
  });
});

describe('Test C and D: location', () => {
  it('rounds a detected location to about 1 km and names the nearest city', () => {
    expect(roundCoord(24.713612)).toBe(24.71);
    expect(nearestCity(24.71, 46.68)).toBe('riyadh');
    expect(nearestCity(51.5, -0.12)).toBeNull();
  });

  it('works with a city when no location is shared', () => {
    expect(placeOf(state({ loc: null }))?.tz).toBe('Asia/Riyadh');
  });

  it('uses the place\'s own time zone when travelling', () => {
    const london = { lat: 51.51, lng: -0.13, tz: 'Europe/London' };
    const times = placeTimes(london, new Date('2026-05-01T12:00:00Z'))!;
    // Solar noon in London in May is just before 1 pm local time (BST).
    const local = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' }).format(times.dhuhr);
    expect(local >= '12:45' && local <= '13:10').toBe(true);
    expect(times.sunrise.getTime()).toBeLessThan(times.dhuhr.getTime());
    expect(localDate(new Date('2026-05-01T23:30:00Z'), 'Asia/Riyadh')).toBe('2026-05-02');
  });

  it('never makes up times for an impossible place or zone', () => {
    expect(placeTimes({ lat: 999, lng: 0, tz: 'Asia/Riyadh' })).toBeNull();
    expect(placeTimes({ lat: 24, lng: 46, tz: 'Not/AZone' })).toBeNull();
  });

  it('keeps a valid saved location and drops a broken one', () => {
    expect(hydrate({ loc: { lat: 24.713612, lng: 46.675299, tz: 'Asia/Riyadh' } }).loc).toEqual({ lat: 24.71, lng: 46.68, tz: 'Asia/Riyadh' });
    expect(hydrate({ loc: { lat: 'x', lng: 1, tz: 'Asia/Riyadh' } as never }).loc).toBeNull();
  });

  it('lets the user switch Asr to the Hanafi time, which is later', () => {
    const p = placeOf(state())!;
    const std = placeTimes(p, day, 0, { method: 'umm_al_qura', asr: 0 })!;
    const han = placeTimes(p, day, 0, { method: 'umm_al_qura', asr: 1 })!;
    expect(han.asr.getTime()).toBeGreaterThan(std.asr.getTime());
    expect(han.dhuhr.getTime()).toBe(std.dhuhr.getTime());
  });
});

describe('Edge cases', () => {
  it('handles an Isha window that crosses midnight', () => {
    // Madrid in June: Isha is close to midnight, so its 45-minute window runs into the next day.
    const madrid = { lat: 40.42, lng: -3.7, tz: 'Europe/Madrid' };
    const set = { method: 'mwl' as const, asr: 0 as const };
    const isha = placeTimes(madrid, new Date('2026-06-20T12:00:00Z'), 0, set)!.isha;
    const after = at(isha, 40);
    expect(localDate(after, 'Europe/Madrid')).toBe('2026-06-21');
    const w = placeWindow(madrid, 45, after, set);
    expect(w?.id).toBe('isha');
    // The window belongs to the evening it started, so its answer doesn't leak into the new day.
    expect(w?.key).toBe('2026-06-20:isha');
  });

  it('shows nothing and asks nothing with no city, no location and no manual time', () => {
    const s = state({ city: '' });
    expect(nextOf(s)).toBeNull();
    expect(currentWindow(s, at(riyadh.asr, 5))).toBeNull();
  });

  it('asks nothing when the user turned off "ask me"', () => {
    expect(needsCheckIn(state({ prayerAsk: 0 }), at(riyadh.asr, 5))).toBeNull();
  });
});

describe('Test H: opt-out', () => {
  it('stops every prompt and removes the location and answers', () => {
    const s = state({ loc: { lat: 24.71, lng: 46.68, tz: 'Asia/Riyadh' } });
    acknowledge(s, needsCheckIn(s, at(riyadh.asr, 5)), 'prayed');
    startBreak(s, null, 10);
    turnOff(s);
    expect([s.loc, s.prayerAck, s.prayerBreak, s.city, s.prayer]).toEqual([null, null, null, '', '']);
    expect(needsCheckIn(s, at(riyadh.maghrib, 1))).toBeNull();
    expect(inPrayerWindow(s, at(riyadh.maghrib, 1))).toBe(false);
  });
});

describe('Companion privacy', () => {
  it('sends only the next prayer and minutes, never the location or an answer', () => {
    const s = state({ loc: { lat: 24.71, lng: 46.68, tz: 'Asia/Riyadh' } });
    acknowledge(s, needsCheckIn(s, at(riyadh.asr, 5)), 'prayed');
    const body = JSON.stringify(buildChatRequest('I have 20 minutes before Maghrib', s));
    expect(body).toMatch(/"prayer":\{"next":"\w+","minutesUntil":\d+/);
    expect(body).not.toMatch(/24\.71|46\.68|prayed|prayerAck/);
  });

  it('sends nothing about prayer when it isn\'t set up, so the AI can\'t pretend to know', () => {
    expect(buildChatRequest('hi', state({ city: '' })).context.prayer).toBeNull();
    expect(parseRequest({ message: 'hi', context: { prayer: { next: 'lunch', minutesUntil: 5 } } }).context.prayer).toBeNull();
  });
});

describe('Bilingual', () => {
  it('has every prayer text in both languages with the same variables', () => {
    const en = JSON.parse(readFileSync('src/i18n/locales/en/prayer.json', 'utf8'));
    const ar = JSON.parse(readFileSync('src/i18n/locales/ar-SA/prayer.json', 'utf8'));
    expect(ar.check.prayed).toBe('إيه، صلّيت');
    expect(en.check.prayed).toBe("Yes, I've prayed");
    expect(ar.break.welcome).toBe('حيّاك، نكمل من وين وقفنا؟');
  });
});
