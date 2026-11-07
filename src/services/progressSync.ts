import type { Store } from '../context/AppStateContext';
import { CHALLENGES } from '../features/challenges/catalog';
import type { AppState, Attempt, ChallengeId, EnergyCheckin, ProgramResult } from '../types';
import { supabase } from './auth';
import { notifyPointsChanged, startDone } from './points';

// Supabase is where progress lives. The device keeps a working copy so the app responds instantly, and this
// module sends anything new to Supabase: each attempt's result, energy check-ins, full energy days and finished
// journeys. Every write is idempotent on the server, so sending twice is harmless. Attempts saved before this
// existed are uploaded once as imported history, which never earns reward points.

const listeners = new Set<() => void>();
/** Lets the progress page refetch after new data reached Supabase. */
export function onProgressChanged(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
const changed = () => listeners.forEach((fn) => fn());

const sentKey = (uid: string) => `kw2:sent:${uid}`;
function readSent(uid: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(sentKey(uid)) || '[]') as string[]);
  } catch {
    return new Set();
  }
}
function writeSent(uid: string, s: Set<string>) {
  try {
    localStorage.setItem(sentKey(uid), JSON.stringify([...s].slice(-400)));
  } catch {
    // Without the cache, events are sent again next time, which the server ignores.
  }
}

const isNetwork = (e: { message?: string; code?: string } | null) => !!e && !e.code && /fetch|network|timeout/i.test(e.message ?? '');
const STATUS: Record<string, string> = { COMPLETED: 'completed', SKIPPED: 'skipped', ABANDONED: 'abandoned' };
const attemptKey = (h: Attempt) => `${h.mid}:${h.i}`;
const importKey = (h: Attempt) => `imp:${h.mid}:${h.ts}:${h.id}`.slice(0, 80);
const asObject = (d: unknown) => (d && typeof d === 'object' && !Array.isArray(d) ? d : null);
const sameRow = (a: Attempt, b: Attempt) => a.mid === b.mid && a.ts === b.ts && a.id === b.id;

let running: Promise<void> | null = null;
let again = false;
let store: Store | null = null;

async function runOnce() {
  const sb = supabase;
  const st = store;
  if (!sb || !st) return;
  const s = st.getState();
  const uid = s.uid;
  if (!uid) return;
  const synced: Attempt[] = [];
  let awarded = false;
  let any = false;

  // Results of attempts played since this existed, in order.
  for (const h of s.hist.filter((x) => x.mid && !x.sy && typeof x.i === 'number' && STATUS[x.status])) {
    await startDone(attemptKey(h));
    const { data, error } = await sb.rpc('finish_challenge_attempt', {
      p_attempt_key: attemptKey(h), p_mission_key: h.mid, p_challenge_id: h.id, p_daily: false, p_status: STATUS[h.status],
      p_accuracy: h.acc, p_retries: h.retries, p_duration_sec: Math.max(0, h.dur), p_xp: h.xp, p_result: asObject(h.data), p_occurred_at: new Date(h.ts).toISOString(),
    });
    if (isNetwork(error)) return finishBatch(st, synced, awarded, any);
    // A refusal is final: retrying it would fail the same way. It is logged without its contents.
    if (error) console.warn(`Progress sync refused an attempt: ${error.code}`);
    if ((data as { awarded?: number } | null)?.awarded) awarded = true;
    synced.push(h);
    any = true;
  }

  // History from before progress moved to Supabase, uploaded once.
  const old = s.hist.filter((x) => x.mid && !x.sy && typeof x.i !== 'number' && STATUS[x.status] && Object.hasOwn(CHALLENGES, x.id));
  for (let i = 0; i < old.length; i += 200) {
    const part = old.slice(i, i + 200);
    const { error } = await sb.rpc('import_challenge_history', {
      p_rows: part.map((h) => ({
        key: importKey(h), mission_key: h.mid.slice(0, 60), challenge_id: h.id, status: STATUS[h.status], accuracy: h.acc,
        retries: h.retries, duration_sec: Math.max(0, h.dur), xp: h.xp, result: asObject(h.data), occurred_at: new Date(h.ts).toISOString(),
      })),
    });
    if (isNetwork(error)) return finishBatch(st, synced, awarded, any);
    if (error) console.warn(`Progress import refused: ${error.code}`);
    synced.push(...part);
    any = true;
  }

  // Energy check-ins, full energy days and finished journeys.
  const sent = readSent(uid);
  const events: [string, string, Record<string, unknown>, number][] = [
    ...s.en.map((e): [string, string, Record<string, unknown>, number] => ['energy', e.d, { e: e.e }, e.ts]),
    ...s.fullDays.map((d): [string, string, Record<string, unknown>, number] => ['full_day', d, {}, Date.parse(d) || Date.now()]),
    ...s.progDone.map((r): [string, string, Record<string, unknown>, number] => ['program', `${r.id}:${r.end}`, { id: r.id, before: r.before, after: r.after, end: r.end }, Date.parse(r.end) || Date.now()]),
  ];
  for (const [kind, key, value, ts] of events) {
    const tag = `${kind}|${key}|${JSON.stringify(value)}`;
    if (sent.has(tag)) continue;
    const { error } = await sb.rpc('record_progress_event', { p_kind: kind, p_key: key, p_value: value, p_occurred_at: new Date(Math.min(ts, Date.now())).toISOString() });
    if (isNetwork(error)) break;
    if (error) console.warn(`Progress event refused: ${error.code}`);
    sent.add(tag);
    any = true;
  }
  writeSent(uid, sent);
  finishBatch(st, synced, awarded, any);
}

function finishBatch(st: Store, synced: Attempt[], awarded: boolean, any: boolean) {
  if (synced.length) {
    st.update((d) => {
      d.hist.forEach((h) => { if (synced.some((x) => sameRow(x, h))) h.sy = 1; });
    });
  }
  if (awarded) notifyPointsChanged();
  if (any) changed();
}

/** Sends anything new now, and resolves once it has been sent (or the attempt failed). */
export function syncNow(): Promise<void> {
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

/** Starts syncing the signed-in user's progress. Returns a function that stops it. */
export function startProgressSync(s: Store) {
  store = s;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last: AppState | null = null;
  const unsub = s.subscribe(() => {
    const cur = s.getState();
    if (cur.hist === last?.hist && cur.en === last?.en && cur.fullDays === last?.fullDays && cur.progDone === last?.progDone) return;
    last = cur;
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), 300);
  });
  void syncNow();
  return () => {
    clearTimeout(timer);
    unsub();
    if (store === s) store = null;
  };
}

/** The daily bonus needs the mission's results on the server first. */
export async function claimDailyBonusAfterSync(missionId: string) {
  await syncNow();
  const sb = supabase;
  if (!sb) return;
  const { data } = await sb.rpc('claim_daily_mission_bonus', { p_mission_key: missionId });
  if ((data as { awarded?: number } | null)?.awarded) notifyPointsChanged();
}

/** "Delete what I typed" also clears it in Supabase. */
export async function clearTypedRemote(): Promise<boolean> {
  const sb = supabase;
  if (!sb) return false;
  const { error } = await sb.rpc('clear_my_typed_text');
  return !error;
}

// Read side: what the progress page shows, entirely from Supabase.
export interface RemoteProgress {
  hist: Attempt[];
  en: EnergyCheckin[];
  fullDays: string[];
  progDone: ProgramResult[];
  xp: number;
}

const UPPER: Record<string, Attempt['status']> = { completed: 'COMPLETED', skipped: 'SKIPPED', abandoned: 'ABANDONED' };

export async function fetchProgress(): Promise<RemoteProgress> {
  const sb = supabase;
  if (!sb) throw new Error('notConfigured');
  const [a, e] = await Promise.all([
    sb.from('challenge_attempts').select('attempt_key, mission_key, challenge_id, status, accuracy, retries, duration_sec, xp, result, finished_at')
      .not('status', 'is', null).order('finished_at', { ascending: true }).limit(5000),
    sb.from('progress_events').select('kind, event_key, value, occurred_at').order('occurred_at', { ascending: true }).limit(2000),
  ]);
  if (a.error) throw new Error(a.error.message);
  if (e.error) throw new Error(e.error.message);
  type Row = { attempt_key: string; mission_key: string; challenge_id: string; status: string; accuracy: number | null; retries: number | null; duration_sec: number | null; xp: number | null; result: unknown; finished_at: string };
  const hist: Attempt[] = (a.data as Row[])
    .filter((r) => Object.hasOwn(CHALLENGES, r.challenge_id) && UPPER[r.status])
    .map((r) => {
      const ts = Date.parse(r.finished_at);
      return {
        mid: r.mission_key, id: r.challenge_id as ChallengeId, status: UPPER[r.status], acc: r.accuracy, retries: r.retries ?? 0, xp: r.xp ?? 0,
        dur: r.duration_sec ?? 0, d: new Date(ts).toDateString(), ts, ...(r.result ? { data: r.result } : {}), sy: 1 as const,
      };
    });
  type Ev = { kind: string; event_key: string; value: Record<string, unknown>; occurred_at: string };
  const ev = e.data as Ev[];
  return {
    hist,
    en: ev.filter((x) => x.kind === 'energy' && ['high', 'mid', 'low'].includes(x.value.e as string))
      .map((x) => ({ d: x.event_key, e: x.value.e as EnergyCheckin['e'], ts: Date.parse(x.occurred_at) })),
    fullDays: ev.filter((x) => x.kind === 'full_day').map((x) => x.event_key),
    progDone: ev.filter((x) => x.kind === 'program').map((x) => x.value as unknown as ProgramResult),
    xp: hist.reduce((n, h) => n + (h.xp || 0), 0),
  };
}
