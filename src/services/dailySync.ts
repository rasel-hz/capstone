import type { Store } from '../context/AppStateContext';
import { MAX_GOALS, todayGoals } from '../features/buddy/buddy';
import { validProfile, type LifeProfile } from '../features/profile/questions';
import { streakTz } from '../features/streak/streak';
import type { AppState, Goal } from '../types';
import { today } from '../utils';
import { supabase } from './auth';
import { onProgressChanged } from './progressSync';

// Keeps the daily streak, today's goals and the onboarding answers in Supabase for the signed-in account,
// so they survive a refresh, signing out and in, and a second device. The device keeps its working copy,
// so the app responds instantly; this module sends changes and, when it starts, brings in what the account
// already has. The streak itself is worked out by the server from completed challenges (refresh_my_streak).
// Until the database has the tables (migration 20261109120000), every call fails quietly and the app keeps
// working from the device alone, as before.

const pad = (n: number) => String(n).padStart(2, '0');
/** A goal day, kept on the device as Date.toDateString(), as the user's local YYYY-MM-DD. */
export function goalDay(d: string): string | null {
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export interface GoalRow {
  goal_id: string;
  text: string;
  position: number;
  done: boolean;
  energy_given: boolean;
  removed: boolean;
}

/**
 * Today's goals after bringing in what the account has. Saved goals come first in their saved order, with
 * their saved state; goals made on this device and not saved yet are kept after them. A goal removed on
 * another device stays removed. Energy already given for a goal, here or elsewhere, is never given twice.
 */
export function mergeGoals(local: Goal[], rows: GoalRow[]): Goal[] {
  const known = new Set(rows.map((r) => r.goal_id));
  const mine = new Map(local.map((g) => [g.id, g]));
  const saved = rows
    .filter((r) => !r.removed)
    .sort((a, b) => a.position - b.position)
    .map((r): Goal => ({ id: r.goal_id, text: r.text, done: r.done ? 1 : 0, ...(r.energy_given || mine.get(r.goal_id)?.e ? { e: 1 as const } : {}) }));
  return [...saved, ...local.filter((g) => !known.has(g.id))].slice(0, MAX_GOALS);
}

/** The rows to save for today's goals, including goals removed since the last save. */
export function goalRows(now: Goal[], before: Goal[]): GoalRow[] {
  const ids = new Set(now.map((g) => g.id));
  return [
    ...now.map((g, i) => ({ goal_id: g.id, text: g.text, position: i, done: !!g.done, energy_given: !!g.e, removed: false })),
    ...before.filter((g) => !ids.has(g.id)).map((g) => ({ goal_id: g.id, text: g.text, position: 0, done: !!g.done, energy_given: !!g.e, removed: true })),
  ];
}

/** Rest days added or turned off since the last save. */
export function restChanges(now: string[], before: string[]): [string, boolean][] {
  const a = new Set(now);
  const b = new Set(before);
  return [...[...a].filter((d) => !b.has(d)).map((d): [string, boolean] => [d, true]), ...[...b].filter((d) => !a.has(d)).map((d): [string, boolean] => [d, false])];
}

/**
 * Rest days after bringing in the account's: days turned on anywhere, plus days only this device knows about
 * (they are sent next). A day turned off on another device stays off.
 */
export function mergeRest(local: string[], rows: { event_key: string; value: { on?: unknown } }[]): string[] {
  const known = new Set(rows.map((r) => r.event_key));
  const on = rows.filter((r) => r.value?.on === true).map((r) => r.event_key);
  return [...new Set([...on, ...local.filter((d) => !known.has(d))])].sort().slice(-60);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The newer of the device's answers and the account's. Answers carry the time they were given. */
export function newerProfile(local: LifeProfile | null, remote: LifeProfile | null): 'local' | 'remote' | 'same' {
  if (!remote) return local ? 'local' : 'same';
  if (!local) return 'remote';
  if (remote.at > local.at) return 'remote';
  if (local.at > remote.at) return 'local';
  return 'same';
}

const missing = (e: { code?: string } | null) => !!e && ['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(e.code ?? '');
let warned = false;
function report(where: string, e: { code?: string; message?: string } | null) {
  if (!e) return;
  // Before the migration is applied this is expected, so it is said once and quietly.
  if (missing(e)) {
    if (!warned) console.info('Daily sync is waiting for the database update (20261109120000).');
    warned = true;
    return;
  }
  console.warn(`Daily sync: ${where} refused (${e.code ?? 'network'})`);
}

interface Seen {
  uid: string;
  pulled: boolean;
  goalsDay: string;
  goals: Goal[];
  rest: string[];
  prof: LifeProfile | null;
  grace: number;
}

let store: Store | null = null;
let seen: Seen | null = null;
let running: Promise<void> | null = null;
let again = false;
let refreshStreak = true;

async function pull(st: Store, uid: string) {
  const sb = supabase;
  if (!sb) return;
  const s = st.getState();
  const day = goalDay(today());

  const [p, g, r] = await Promise.all([
    sb.from('profiles').select('life_profile').eq('id', uid).maybeSingle(),
    day ? sb.from('daily_goals').select('goal_id, text, position, done, energy_given, removed').eq('day', day) : Promise.resolve({ data: null, error: null }),
    sb.from('progress_events').select('event_key, value').eq('kind', 'rest_day'),
  ]);
  report('reading answers', p.error);
  report('reading goals', g.error);
  report('reading rest days', r.error);

  const remote = p.error ? null : validProfile((p.data as { life_profile?: unknown } | null)?.life_profile ?? null);
  const which = p.error ? 'same' : newerProfile(s.prof, remote);
  const rows = g.error || !g.data ? null : (g.data as GoalRow[]);
  const restRows = r.error || !r.data ? null : (r.data as { event_key: string; value: { on?: unknown } }[]);

  st.update((d) => {
    if (which === 'remote') d.prof = remote;
    if (rows) d.goals = { d: today(), items: mergeGoals(todayGoals(d), rows) };
    if (restRows) d.rest = mergeRest(d.rest, restRows);
  });
  const after = st.getState();
  // What the device has and the account doesn't is sent on the next step.
  seen = {
    uid, pulled: true, goalsDay: today(),
    goals: rows ? rows.filter((x) => !x.removed).map((x) => ({ id: x.goal_id, text: x.text, done: x.done ? 1 : 0 })) : todayGoals(after),
    rest: restRows ? restRows.filter((x) => x.value?.on === true).map((x) => x.event_key) : after.rest,
    grace: after.streakGrace,
    prof: which === 'local' ? remote : after.prof,
  };
}

async function push(st: Store, v: Seen) {
  const sb = supabase;
  if (!sb) return;
  const s = st.getState();

  // Onboarding answers. Never cleared from the account by an empty device.
  if (s.prof && !same(s.prof, v.prof)) {
    const { error } = await sb.from('profiles').update({ life_profile: s.prof }).eq('id', v.uid);
    report('saving answers', error);
    if (!error || missing(error)) v.prof = s.prof;
  }

  // Today's goals. A new day starts a fresh list; yesterday's rows stay saved as they were.
  const day = goalDay(today());
  if (v.goalsDay !== today()) {
    v.goalsDay = today();
    v.goals = [];
  }
  const now = todayGoals(s);
  if (day && !same(now, v.goals)) {
    const rows = goalRows(now, v.goals);
    if (rows.length) {
      const { error } = await sb.from('daily_goals').upsert(rows.map((r) => ({ ...r, user_id: v.uid, day })), { onConflict: 'user_id,day,goal_id' });
      report('saving goals', error);
      if (error && !missing(error)) return;
    }
    v.goals = now;
  }

  // Rest days, kept with the other progress events.
  for (const [d, on] of restChanges(s.rest, v.rest)) {
    const { error } = await sb.rpc('record_progress_event', { p_kind: 'rest_day', p_key: d, p_value: { on }, p_occurred_at: new Date().toISOString() });
    report('saving a rest day', error);
    if (error && !missing(error)) return;
  }
  if (!same(s.rest, v.rest)) refreshStreak = true;
  v.rest = s.rest;
  if (s.streakGrace !== v.grace) {
    v.grace = s.streakGrace;
    refreshStreak = true;
  }
}

async function refresh(st: Store, v: Seen) {
  const sb = supabase;
  if (!sb) return;
  const s = st.getState();
  const sentRest = s.rest;
  const { data, error } = await sb.rpc('refresh_my_streak', { p_tz: streakTz(s), p_grace: s.streakGrace !== 0 });
  report('updating the streak', error);
  if (error || !data) return;
  const r = data as { days?: unknown; rest?: unknown };
  const days = Array.isArray(r.days) ? r.days.filter((x): x is string => typeof x === 'string') : [];
  const rest = Array.isArray(r.rest) ? r.rest.filter((x): x is string => typeof x === 'string') : null;
  st.update((d) => {
    d.streakDays = days.slice(-400);
    // The account's rest days, from every device. Skipped if the user changed them meanwhile; the next run sends that.
    if (rest && same(d.rest, sentRest)) d.rest = rest.slice(-60);
  });
  // What the server returned is what it has, so it isn't sent back.
  if (rest && same(st.getState().rest, rest.slice(-60))) v.rest = st.getState().rest;
}

async function runOnce() {
  const st = store;
  const uid = st?.getState().uid;
  if (!st || !uid || !supabase) return;
  if (!seen || seen.uid !== uid || !seen.pulled) {
    await pull(st, uid);
    refreshStreak = true;
  }
  const v = seen;
  if (!v) return;
  await push(st, v);
  if (refreshStreak) {
    refreshStreak = false;
    await refresh(st, v);
  }
}

/** Sends anything new now, and resolves once it has been sent (or the attempt failed). */
export function dailySyncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await runOnce().catch(() => {});
    } while (again);
  })().finally(() => { running = null; });
  return running;
}

const watched = (s: AppState) => JSON.stringify([s.uid, s.prof, s.goals, s.rest, s.streakGrace]);

/** Starts keeping the signed-in user's streak, goals and answers in Supabase. Returns a function that stops it. */
export function startDailySync(s: Store) {
  store = s;
  seen = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = watched(s.getState());
  const unsub = s.subscribe(() => {
    const cur = watched(s.getState());
    if (cur === last) return;
    last = cur;
    clearTimeout(timer);
    timer = setTimeout(() => void dailySyncNow(), 300);
  });
  // A completed challenge reaches Supabase first, then the server works out the streak again.
  const offProgress = onProgressChanged(() => {
    refreshStreak = true;
    void dailySyncNow();
  });
  void dailySyncNow();
  return () => {
    clearTimeout(timer);
    unsub();
    offProgress();
    if (store === s) {
      store = null;
      seen = null;
    }
  };
}
