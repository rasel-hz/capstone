import type { AppState } from '../../types/index.ts';
import { CHALLENGES } from '../challenges/catalog.ts';
import { localDate, SAUDI_TZ } from '../prayer/times.ts';

// A humane daily streak. It is worked out from recorded attempts, so a day can only count once, repeat
// events can't inflate it, and existing users get their real history. It never measures anyone's health.
//
// A day qualifies when at least one real challenge was completed. Opening the app, answering questions,
// prayer check-ins and self-report check-ins never count.
// A rest day the user chooses keeps the streak without adding to it, up to 2 in any 7 days.
// With grace on, one unplanned missed day in any 7 days is protected automatically.
// Today never breaks a streak: until the day is over, it's simply still open.

export const MILESTONES = [
  { n: 1, id: 'seed' }, { n: 3, id: 'spark' }, { n: 7, id: 'flame' }, { n: 14, id: 'star' }, { n: 30, id: 'trophy' },
] as const;
export type MilestoneId = (typeof MILESTONES)[number]['id'];
export const MAX_REST_IN_7 = 2;
const GRACE_EVERY = 7;
const MAX_DAYS = 400;

export type DayMark = 'done' | 'rest' | 'protected' | 'none';
export interface StreakView {
  current: number;
  longest: number;
  todayDone: boolean;
  todayRest: boolean;
  marks: Record<string, DayMark>;
  today: string;
}

/** The user's chosen place decides their calendar day, otherwise the device's zone. */
export function streakTz(s: AppState): string {
  if (s.loc?.tz) return s.loc.tz;
  if (s.city) return SAUDI_TZ;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || SAUDI_TZ;
}

const dayNum = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 864e5);
const numDay = (n: number) => new Date(n * 864e5).toISOString().slice(0, 10);

export function qualifyingDays(s: AppState, tz = streakTz(s)): Set<string> {
  // Days Supabase already counted, from any device, plus anything played here that isn't synced yet.
  const out = new Set<string>(s.streakDays ?? []);
  for (const h of s.hist) {
    if (h.status === 'COMPLETED' && CHALLENGES[h.id] && !CHALLENGES[h.id].selfReport && Number.isFinite(h.ts)) out.add(localDate(new Date(h.ts), tz));
  }
  return out;
}

export function streakOf(s: AppState, now = new Date()): StreakView {
  const tz = streakTz(s);
  const today = localDate(now, tz);
  const q = qualifyingDays(s, tz);
  const rest = new Set(s.rest ?? []);
  const end = dayNum(today);
  const marks: Record<string, DayMark> = {};
  const starts = [...q, ...rest].map(dayNum).filter((n) => n <= end);
  const start = starts.length ? Math.max(Math.min(...starts), end - MAX_DAYS) : end;
  let current = 0;
  let longest = 0;
  let lastGrace = -Infinity;
  for (let n = start; n <= end; n++) {
    const d = numDay(n);
    if (q.has(d)) {
      current++;
      marks[d] = 'done';
    } else if (rest.has(d)) {
      marks[d] = 'rest';
    } else if (n === end) {
      marks[d] = 'none'; // Still open.
    } else if (s.streakGrace !== 0 && current > 0 && n - lastGrace >= GRACE_EVERY) {
      lastGrace = n;
      marks[d] = 'protected';
    } else {
      current = 0;
      marks[d] = 'none';
    }
    longest = Math.max(longest, current);
  }
  return { current, longest, todayDone: q.has(today), todayRest: rest.has(today), marks, today };
}

export function canRest(s: AppState, now = new Date()): boolean {
  const v = streakOf(s, now);
  if (v.todayDone || v.todayRest) return false;
  const end = dayNum(v.today);
  return (s.rest ?? []).filter((d) => end - dayNum(d) < 7 && end - dayNum(d) >= 0).length < MAX_REST_IN_7;
}

/** Marks today as a chosen rest day. It earns nothing and asks nothing. */
export function takeRest(s: AppState, now = new Date()) {
  if (!canRest(s, now)) return false;
  s.rest = [...(s.rest ?? []), streakOf(s, now).today].slice(-60);
  return true;
}

export function undoRest(s: AppState, now = new Date()) {
  const t = streakOf(s, now).today;
  s.rest = (s.rest ?? []).filter((d) => d !== t);
}

/** The newest milestone reached and not yet celebrated. Each is celebrated once, ever. */
export function pendingMilestone(s: AppState, now = new Date()) {
  const { current } = streakOf(s, now);
  const hit = [...MILESTONES].reverse().find((m) => current >= m.n);
  return hit && hit.n > (s.streakSeen ?? 0) ? hit : null;
}

/** The last n days, oldest first, for the calendar. */
export function recentDays(v: StreakView, n = 14) {
  const end = dayNum(v.today);
  return Array.from({ length: n }, (_, i) => {
    const d = numDay(end - (n - 1 - i));
    return { d, mark: v.marks[d] ?? 'none', today: d === v.today };
  });
}

export const nextMilestone = (current: number) => MILESTONES.find((m) => m.n > current) ?? null;
