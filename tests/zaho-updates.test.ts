import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../src/features/challenges/catalog';
import { emptyProfile, isMulti, validProfile } from '../src/features/profile/questions';
import { qualifyingDays, streakOf } from '../src/features/streak/streak';
import { goalDay, goalRows, mergeGoals, mergeRest, newerProfile, restChanges, type GoalRow } from '../src/services/dailySync';
import { defaultState, hydrate } from '../src/services/storage';
import type { AppState } from '../src/types';

const read = (p: string) => readFileSync(p, 'utf8');
const json = (p: string) => JSON.parse(read(p));
const locales = ['ar-SA', 'en'];

describe('help style is multiple choice', () => {
  it('is asked as multiple choice', () => {
    expect(isMulti('style')).toBe(true);
  });

  it('keeps every picked kind of help, and drops unknown ones', () => {
    const p = validProfile({ ...emptyProfile(), style: ['games', 'calm', 'nope', 'games'] });
    expect(p?.style).toEqual(['games', 'calm']);
  });

  it('reads an answer saved before as a list of one', () => {
    expect(validProfile({ ...emptyProfile(), style: 'talk' })?.style).toEqual(['talk']);
    expect(validProfile({ ...emptyProfile(), style: null })?.style).toEqual([]);
  });
});

describe('removed screens', () => {
  it('onboarding no longer shows the privacy note', () => {
    expect(read('src/pages/Onboarding/index.tsx')).not.toContain('onboarding.privacy');
    for (const l of locales) expect(json(`src/i18n/locales/${l}/onboarding.json`).privacy).toBeUndefined();
  });

  it('the privacy section keeps only the delete-everything button', () => {
    const page = read('src/pages/Settings/index.tsx');
    const privacy = page.slice(page.indexOf('<Group id="privacy"'), page.indexOf('</Group>', page.indexOf('<Group id="privacy"')));
    expect(privacy).toContain("t('settings.wipe')");
    for (const gone of ['settings.ai', 'settings.stored', 'settings.approved', 'settings.export', 'settings.clearTyped']) expect(privacy).not.toContain(gone);
    expect(page).toContain('store.reset()');
  });

  it('the prayer question and driving settings are gone', () => {
    const page = read('src/pages/Settings/index.tsx');
    for (const gone of ['prayer.settings.ask', 'settings.driving', 'settings.drivingNow', 'settings.driveHours', 'settings.notConnected']) expect(page).not.toContain(gone);
  });

  it('progress shows only the streak and journey results', () => {
    const page = read('src/pages/Progress/index.tsx');
    for (const gone of ['progress.tileCompleted', 'common.level', 'progress.tileRate', 'progress.tileAccuracy', 'progress.activity', 'progress.asTable', 'progress.selfTitle',
      'progress.fullDays.title', 'progress.scoredTitle', 'progress.unscoredTitle', 'progress.notesTitle']) expect(page).not.toContain(gone);
    for (const kept of ['<WeekStreak', 'progress.programs.title', 'progress.brief.refresh']) expect(page).toContain(kept);
  });
});

describe('the companion is called Zaho', () => {
  it('in both languages and in the model instructions', () => {
    expect(json('src/i18n/locales/en/common.json').brand).toBe('ZAHO');
    expect(json('src/i18n/locales/ar-SA/common.json').pageTitle).toMatch(/\| Zaho$/);
    expect(read('server/prompt.ts')).toMatch(/You are \S+ \(Zaho\)/);
    for (const l of locales) {
      for (const f of ['common', 'nav', 'companion', 'landing', 'profile', 'onboarding']) expect(read(`src/i18n/locales/${l}/${f}.json`)).not.toMatch(/khowayk/i);
    }
  });
});

describe('driving', () => {
  it('a saved "driving now" is cleared on load, so nobody is locked out', () => {
    expect(hydrate({ ...defaultState(), driving: 1 }).driving).toBe(0);
  });
});

const state = (p: Partial<AppState> = {}): AppState => ({ ...defaultState(), city: 'riyadh', ...p });

describe('streak days from Supabase', () => {
  it('count with the device history, once per day', () => {
    const s = state({ streakDays: ['2026-11-07', '2026-11-08'] });
    expect([...qualifyingDays(s)].sort()).toEqual(['2026-11-07', '2026-11-08']);
    const v = streakOf(s, new Date('2026-11-09T10:00:00+03:00'));
    // Today is still open, so the streak holds.
    expect(v.current).toBe(2);
    expect(v.todayDone).toBe(false);
  });

  it('reset only after a whole missed day (grace off)', () => {
    const s = state({ streakDays: ['2026-11-06'], streakGrace: 0 });
    expect(streakOf(s, new Date('2026-11-07T22:00:00+03:00')).current).toBe(1);
    expect(streakOf(s, new Date('2026-11-08T09:00:00+03:00')).current).toBe(0);
  });

  it('are checked on load', () => {
    expect(hydrate({ ...defaultState(), streakDays: ['2026-11-01', 'bad', 3 as unknown as string] }).streakDays).toEqual(['2026-11-01']);
  });

  it('use the same self-report rule as the server', () => {
    // The newest definition of the streak function is the one in force.
    const sql = read('supabase/migrations/20261111120000_dhikr_not_a_challenge.sql');
    const listed = sql.slice(sql.indexOf('function public.refresh_my_streak')).match(/challenge_id <> all \(array\[([^\]]*)\]\)/)?.[1].match(/'([a-z0-9_]+)'/g)?.map((x) => x.slice(1, -1)).sort();
    const self = Object.entries(CHALLENGES).filter(([, c]) => (c as { selfReport?: boolean }).selfReport).map(([id]) => id).sort();
    expect(listed).toEqual(self);
  });
});

describe('daily goals sync', () => {
  const row = (p: Partial<GoalRow>): GoalRow => ({ goal_id: 'g1', text: 'Read', position: 0, done: false, energy_given: false, removed: false, ...p });

  it('brings in saved goals in order, keeps unsaved ones and leaves removed ones out', () => {
    const local = [{ id: 'g9', text: 'Local only', done: 0 as const }, { id: 'g2', text: 'Gone', done: 0 as const }];
    const merged = mergeGoals(local, [row({ goal_id: 'g3', position: 1, text: 'Second' }), row({ goal_id: 'g1', position: 0, done: true }), row({ goal_id: 'g2', removed: true })]);
    expect(merged.map((g) => g.id)).toEqual(['g1', 'g3', 'g9']);
    expect(merged[0].done).toBe(1);
  });

  it('never gives energy twice for a goal', () => {
    expect(mergeGoals([{ id: 'g1', text: 'Read', done: 1, e: 1 }], [row({ energy_given: false })])[0].e).toBe(1);
    expect(mergeGoals([], [row({ energy_given: true })])[0].e).toBe(1);
  });

  it('marks goals removed since the last save instead of deleting them', () => {
    const rows = goalRows([{ id: 'g2', text: 'B', done: 1 }], [{ id: 'g1', text: 'A', done: 0 }, { id: 'g2', text: 'B', done: 0 }]);
    expect(rows).toEqual([
      { goal_id: 'g2', text: 'B', position: 0, done: true, energy_given: false, removed: false },
      { goal_id: 'g1', text: 'A', position: 0, done: false, energy_given: false, removed: true },
    ]);
  });

  it('saves the day as the local calendar date', () => {
    expect(goalDay(new Date(2026, 10, 9, 23, 30).toDateString())).toBe('2026-11-09');
    expect(goalDay('not a date')).toBeNull();
  });
});

describe('rest days and answers sync', () => {
  it('sends only what changed', () => {
    expect(restChanges(['2026-11-09'], ['2026-11-08'])).toEqual([['2026-11-09', true], ['2026-11-08', false]]);
    expect(restChanges(['2026-11-09'], ['2026-11-09'])).toEqual([]);
  });

  it('keeps a rest day turned off on another device off', () => {
    expect(mergeRest(['2026-11-08', '2026-11-09'], [{ event_key: '2026-11-08', value: { on: false } }, { event_key: '2026-11-07', value: { on: true } }])).toEqual(['2026-11-07', '2026-11-09']);
  });

  it('keeps the newer onboarding answers, and never replaces answers with nothing', () => {
    const a = { ...emptyProfile(), at: 1 };
    const b = { ...emptyProfile(), at: 2 };
    expect(newerProfile(a, b)).toBe('remote');
    expect(newerProfile(b, a)).toBe('local');
    expect(newerProfile(null, a)).toBe('remote');
    expect(newerProfile(a, null)).toBe('local');
    expect(newerProfile(null, null)).toBe('same');
  });
});
