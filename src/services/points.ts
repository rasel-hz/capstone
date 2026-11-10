import { supabase } from './auth';

// Points live in Supabase. The browser only reports that a challenge started or finished; the database
// checks the timing, awards points once and unlocks rewards. Nothing here is stored as a balance on the device.

export interface Reward {
  id: string;
  brand_ar: string;
  brand_en: string;
  title_ar: string;
  title_en: string;
  cta_ar: string;
  cta_en: string;
  required_points: number;
  category: 'coffee' | 'shopping' | 'entertainment';
  website_url: string;
  logo_url: string | null;
  accent_color: string;
  logo_background: string | null;
  sort_order: number;
}

export interface Redemption {
  id: number;
  reward_id: string;
  points: number;
  url: string;
  redeemed_at: string;
}

export interface PointsSummary {
  /** Points ever earned. Never goes down. */
  lifetime: number;
  today: number;
  unlocks: { reward_id: string; unlocked_at: string; celebrated: boolean }[];
  /** Points earned minus points redeemed. Missing until the redemption migration is applied. */
  balance?: number;
  redemptions?: Redemption[];
}

/** What the user can spend now. Before redemption exists on the server, that is everything earned. */
export const spendable = (s: PointsSummary) => (typeof s.balance === 'number' ? s.balance : s.lifetime);
/** True once the server can record redemptions. */
export const canRedeemOnServer = (s: PointsSummary) => typeof s.balance === 'number';

export type RedeemResult =
  | { status: 'redeemed' | 'already'; redemption_id: number; reward_id: string; points: number; url: string; redeemed_at: string; balance: number }
  | { status: 'insufficient'; reward_id: string; required: number; balance: number };

/** A key for one confirmation. The same key sent twice is charged once. */
export const newRequestKey = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9_-]/g, '');

/** Spends a reward's points on the server, which checks the balance and records it in one step. */
export async function redeemReward(rewardId: string, requestKey: string): Promise<RedeemResult> {
  const { data, error } = await db().rpc('redeem_reward', { p_reward_id: rewardId, p_request_key: requestKey });
  if (error) throw new PointsError(error.code === 'PGRST202' || error.code === '42883' ? 'notAvailable' : error.message);
  return data as RedeemResult;
}

export class PointsError extends Error {}

function db() {
  if (!supabase) throw new PointsError('notConfigured');
  return supabase;
}

/** The catalog text comes from the shared database, so emoji are removed here as well as in the seed data. */
export const withoutEmoji = (s: string) => s.replace(/\s*[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]+/gu, '').trim();

export async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await db().from('rewards')
    .select('id, brand_ar, brand_en, title_ar, title_en, cta_ar, cta_en, required_points, category, website_url, logo_url, accent_color, logo_background, sort_order')
    .order('sort_order');
  if (error) throw new PointsError(error.message);
  return ((data ?? []) as Reward[]).map((r) => ({
    ...r,
    title_ar: withoutEmoji(r.title_ar),
    title_en: withoutEmoji(r.title_en),
    cta_ar: withoutEmoji(r.cta_ar),
    cta_en: withoutEmoji(r.cta_en),
  }));
}

export async function fetchSummary(): Promise<PointsSummary> {
  const { data, error } = await db().rpc('my_points_summary');
  if (error) throw new PointsError(error.message);
  return data as PointsSummary;
}

export async function markCelebrated() {
  await db().rpc('mark_rewards_celebrated');
}

/** Only https links from the catalog are opened. */
export const safeUrl = (u: string) => {
  try {
    return new URL(u).protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
};

// Reporting from the mission player. These never block or break play: without a session or a connection
// nothing is awarded, and the app carries on. How an attempt ended, and its points, are sent by progressSync.
const starts = new Map<string, Promise<unknown>>();
const listeners = new Set<() => void>();

/** Lets an open rewards page refresh after points were awarded. */
export function onPointsChanged(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export const notifyPointsChanged = () => listeners.forEach((fn) => fn());

async function call(fn: string, args: Record<string, unknown>, tries = 3): Promise<unknown> {
  const sb = supabase;
  if (!sb) return null;
  for (let i = 0; i < tries; i++) {
    const { data, error } = await sb.rpc(fn, args);
    if (!error) return data;
    // A refusal from the database is final. Only network errors retry.
    if (error.code || !/fetch|network/i.test(error.message)) return null;
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  return null;
}

/** Records the start time on the server, so the finish can be checked before points are awarded. */
export function reportStart(missionId: string, idx: number, challengeId: string, daily: boolean) {
  const k = `${missionId}:${idx}`;
  starts.set(k, call('start_challenge_attempt', { p_attempt_key: k, p_mission_key: missionId, p_challenge_id: challengeId, p_daily: daily }).catch(() => null));
}

/** Waits for that attempt's start to reach the server, if it was sent from this session. */
export const startDone = (key: string) => starts.get(key) ?? Promise.resolve();
