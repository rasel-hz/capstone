import type { AppState, DayGoals, Goal } from '../../types/index.ts';
import { today } from '../../utils/index.ts';

// Today's goals and the buddy's energy. Doing things for yourself fills the buddy's energy for the day.
// Nothing here is ever taken away: a new day simply starts fresh.
export const MAX_GOALS = 6;
export const GOAL_LEN = 60;
export const ENERGY_FULL = 5;

const clean = (x: string) => x.replace(/\s+/g, ' ').trim().slice(0, GOAL_LEN);

export const todayGoals = (s: AppState, d = today()): Goal[] => (s.goals && s.goals.d === d ? s.goals.items : []);

/** Adds goals in the user's own words. Repeats and anything past the limit are left out. Returns how many were added. */
export function addGoals(s: AppState, texts: string[], d = today()) {
  const items = todayGoals(s, d).slice();
  const seen = new Set(items.map((g) => g.text.toLowerCase()));
  let added = 0;
  for (const raw of texts) {
    const text = clean(raw);
    if (!text || seen.has(text.toLowerCase()) || items.length >= MAX_GOALS) continue;
    seen.add(text.toLowerCase());
    items.push({ id: `g${Date.now().toString(36)}${items.length}`, text, done: 0 });
    added++;
  }
  s.goals = { d, items };
  return added;
}

export function removeGoal(s: AppState, id: string, d = today()) {
  if (s.goals && s.goals.d === d) s.goals.items = s.goals.items.filter((g) => g.id !== id);
}

/**
 * Ticks or unticks a goal. Energy comes only the first time it's ticked, so unticking costs nothing.
 * Goals are self-reported, so they never earn points.
 */
export function toggleGoal(s: AppState, id: string, d = today()) {
  const g = todayGoals(s, d).find((x) => x.id === id);
  if (!g) return false;
  g.done = g.done ? 0 : 1;
  if (g.done && !g.e) {
    g.e = 1;
    addEnergy(s, d);
    return true;
  }
  return false;
}

/** Today's energy. Yesterday's doesn't carry over, so it never reads as a debt. */
export const energyToday = (s: AppState, d = today()) => (s.nrgD === d ? s.nrg : 0);

export function addEnergy(s: AppState, d = today()) {
  s.nrg = Math.min(ENERGY_FULL, energyToday(s, d) + 1);
  s.nrgD = d;
  if (s.nrg >= ENERGY_FULL && !s.fullDays.includes(d)) s.fullDays = [...s.fullDays, d].slice(-60);
}

/** Which of the last n days, oldest first, had full energy. */
export function fullDaysIn(s: AppState, n = 7, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (n - 1 - i));
    return { date: day, full: s.fullDays.includes(day.toDateString()) };
  });
}

/**
 * How the buddy looks on Home. On a low-energy day it looks sad with the user rather than cheerful;
 * otherwise it's sleepy before anything is done today and awake once energy comes in.
 */
export function buddyMood(s: AppState, low: boolean, d = today()): 'concerned' | 'resting' | 'idle' {
  if (low) return 'concerned';
  return energyToday(s, d) === 0 ? 'resting' : 'idle';
}

/** Checks saved goals and energy, so a bad value can't break Home. */
export function validBuddy(s: AppState, d = today()) {
  const g = s.goals as DayGoals | null;
  s.goals = g && g.d === d && Array.isArray(g.items)
    ? {
        d,
        items: g.items.filter((x) => x && typeof x.id === 'string' && typeof x.text === 'string' && clean(x.text)).slice(0, MAX_GOALS).map((x) => ({ id: x.id, text: clean(x.text), done: x.done ? 1 : 0, ...(x.e ? { e: 1 as const } : {}) })),
      }
    : null;
  s.nrg = Number.isFinite(s.nrg) ? Math.max(0, Math.min(ENERGY_FULL, Math.round(s.nrg))) : 0;
  if (typeof s.nrgD !== 'string') s.nrgD = '';
  s.fullDays = Array.isArray(s.fullDays) ? s.fullDays.filter((x) => typeof x === 'string').slice(-60) : [];
}
