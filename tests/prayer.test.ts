import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inPrayerWindow } from '../src/features/mission/planner';
import { CITY_IDS, formatPrayerTime, inCalculatedWindow, isRamadan, nextPrayer, PRAYERS, prayerTimes } from '../src/features/prayer/times';
import { defaultState, hydrate } from '../src/services/storage';
import type { AppState } from '../src/types';

const fresh = (o: Partial<AppState> = {}) => ({ ...defaultState(), ...o });
const MIN = 60_000;
// Noon in Riyadh on 7 November 2026, and a day in Ramadan 1448.
const NOV = new Date('2026-11-07T09:00:00Z');
const RAMADAN = new Date('2027-02-20T09:00:00Z');
const riyadh = (d: Date) => formatPrayerTime(d, 'en-GB');

describe('calculated prayer times', () => {
  it('match the published Umm al-Qura times for Riyadh, to the minute or two', () => {
    const t = prayerTimes('riyadh', NOV)!;
    // Published: Fajr 4:45, Dhuhr 11:37, Asr 2:47, Maghrib 5:09, Isha 6:39.
    const diff = (d: Date, hhmm: string) => {
      const [h, m] = riyadh(d).split(':').map(Number);
      const [eh, em] = hhmm.split(':').map(Number);
      return Math.abs(h * 60 + m - (eh * 60 + em));
    };
    expect(diff(t.fajr, '04:45')).toBeLessThanOrEqual(2);
    expect(diff(t.dhuhr, '11:37')).toBeLessThanOrEqual(2);
    expect(diff(t.asr, '14:47')).toBeLessThanOrEqual(2);
    expect(diff(t.maghrib, '17:09')).toBeLessThanOrEqual(2);
    expect(diff(t.isha, '18:39')).toBeLessThanOrEqual(2);
  });

  it('puts the five prayers in order', () => {
    CITY_IDS.forEach((c) => {
      const t = prayerTimes(c, NOV)!;
      PRAYERS.slice(1).forEach((p, i) => expect(t[p].getTime(), `${c} ${p}`).toBeGreaterThan(t[PRAYERS[i]].getTime()));
    });
  });

  it('sets Isha 90 minutes after Maghrib, and 120 in Ramadan', () => {
    expect(isRamadan(NOV)).toBe(false);
    expect(isRamadan(RAMADAN)).toBe(true);
    const gap = (d: Date) => { const t = prayerTimes('riyadh', d)!; return (t.isha.getTime() - t.maghrib.getTime()) / MIN; };
    expect(gap(NOV)).toBe(90);
    expect(gap(RAMADAN)).toBe(120);
  });

  it('gives no times for an unknown city', () => {
    expect(prayerTimes('nowhere', NOV)).toBeNull();
    expect(nextPrayer('nowhere', NOV)).toBeNull();
    expect(inCalculatedWindow('nowhere', 30, NOV)).toBe(false);
  });

  it('finds the next prayer, and moves to tomorrow after Isha', () => {
    const t = prayerTimes('riyadh', NOV)!;
    expect(nextPrayer('riyadh', NOV)?.id).toBe('asr');
    const late = new Date(t.isha.getTime() + 10 * MIN);
    const next = nextPrayer('riyadh', late)!;
    expect(next.id).toBe('fajr');
    expect(next.at.getTime()).toBeGreaterThan(late.getTime());
  });

  it('shows Saudi time in Western digits in both languages', () => {
    const t = prayerTimes('riyadh', NOV)!;
    expect(formatPrayerTime(t.dhuhr, 'ar-SA')).toMatch(/^11:3\d/);
    expect(formatPrayerTime(t.dhuhr, 'en')).toMatch(/^11:3\d/);
  });
});

describe('prayer protection', () => {
  const dhuhr = prayerTimes('riyadh', NOV)!.dhuhr.getTime();
  const at = (mins: number) => new Date(dhuhr + mins * MIN);

  it('protects every prayer of the day once a city is chosen', () => {
    const s = fresh({ city: 'riyadh', pp: 30 });
    expect(inPrayerWindow(s, at(-1))).toBe(true);
    expect(inPrayerWindow(s, at(10))).toBe(true);
    expect(inPrayerWindow(s, at(31))).toBe(false);
    expect(inPrayerWindow(s, at(-10))).toBe(false);
    const asr = prayerTimes('riyadh', NOV)!.asr;
    expect(inPrayerWindow(s, new Date(asr.getTime() + 5 * MIN))).toBe(true);
  });

  it('protects nothing when the user chose no protection', () => {
    expect(inPrayerWindow(fresh({ city: 'riyadh', pp: 0 }), at(5))).toBe(false);
  });

  it('uses the city instead of a manual time, and the manual time without one', () => {
    const local = new Date(dhuhr);
    const manual = `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`;
    expect(inPrayerWindow(fresh({ prayer: manual, pp: 30 }), at(10))).toBe(true);
    expect(inPrayerWindow(fresh({ city: 'riyadh', prayer: '03:00', pp: 30 }), at(10))).toBe(true);
  });
});

describe('saved city', () => {
  it('defaults to no city, keeps a known one and drops anything else', () => {
    expect(defaultState().city).toBe('');
    expect(hydrate({}).city).toBe('');
    expect(hydrate({ city: 'jeddah' }).city).toBe('jeddah');
    expect(hydrate({ city: 'atlantis' }).city).toBe('');
    expect(hydrate({ city: 'toString' }).city).toBe('');
  });

  it('has a name for every city in both languages', () => {
    ['ar-SA', 'en'].forEach((l) => {
      const names = JSON.parse(readFileSync(`src/i18n/locales/${l}/common.json`, 'utf8')).cities;
      expect(Object.keys(names).sort(), l).toEqual([...CITY_IDS].sort());
    });
  });
});
