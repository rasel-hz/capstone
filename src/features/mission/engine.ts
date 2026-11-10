import type { AppState, ChallengeId, GameResult, ItemStatus, Mission, MissionItem, PlannedItem, Seed } from '../../types';
import { tr } from '../../i18n';
import { level, today } from '../../utils';
import { CHALLENGES } from '../challenges/catalog';
import { addEnergy } from '../buddy/buddy';
import { recordProgramDay } from '../program/program';
import { completePlay } from '../path/planner';
import { isLowEnergy } from './planner';

// All functions mutate a draft handed in by the store, so they stay plain and unit-testable.
const FINISHED: ItemStatus[] = ['COMPLETED', 'SKIPPED', 'ABANDONED'];

export const currentItem = (s: AppState): MissionItem | undefined => s.mission?.items[s.mission.idx];
export const hasOpenMission = (s: AppState) => !!s.mission && s.mission.status !== 'DONE' && s.mission.idx < s.mission.items.length;

export function createMission(s: AppState, items: PlannedItem[], solo: boolean) {
  s.mission = {
    id: 'm' + Date.now(),
    solo,
    items: items.map((i) => ({ ...i, status: 'NOT_STARTED', retries: 0, xp: 0, acc: null })),
    idx: 0,
    status: 'IN_PROGRESS',
    started: 0,
  };
}

function clearPause(it: MissionItem) {
  if (it.pauseAt) {
    it.paused = (it.paused || 0) + Date.now() - it.pauseAt;
    it.pauseAt = 0;
  }
}

function record(s: AppState, it: MissionItem, status: ItemStatus, data?: unknown) {
  s.hist.push({
    mid: s.mission!.id, i: s.mission!.idx, id: it.id, status, acc: it.acc, retries: it.retries, xp: it.xp || 0,
    dur: Math.round(((it.end || Date.now()) - (it.start || Date.now()) - (it.paused || 0)) / 1000),
    d: today(), ts: Date.now(), ...(data !== undefined ? { data } : {}),
  });
}

function markDone(s: AppState, M: Mission) {
  M.status = 'DONE';
  if (!M.solo) s.lastDaily = { d: today(), all: M.items.every((i) => i.status === 'COMPLETED') };
}

// Moves past items that already finished, so a refresh or exit can never replay one.
export function settle(s: AppState) {
  const M = s.mission;
  if (!M || M.status === 'DONE') return;
  while (M.idx < M.items.length && FINISHED.includes(M.items[M.idx].status)) M.idx++;
  if (M.idx >= M.items.length) markDone(s, M);
}

export function beginItem(s: AppState) {
  const M = s.mission!;
  const it = M.items[M.idx];
  clearPause(it);
  M.status = 'IN_PROGRESS';
  it.status = 'IN_PROGRESS';
  it.start = it.start || Date.now();
}

export interface FinishOutcome {
  xp: number;
  leveledUp: boolean;
  newLevel: number;
}

// Returns null when this item already finished, which is what keeps XP from being paid twice.
export function completeItem(s: AppState, r: GameResult): FinishOutcome | null {
  const M = s.mission!;
  const it = M.items[M.idx];
  if (it.status === 'COMPLETED') return null;
  it.end = Date.now();
  it.acc = r.acc;
  it.retries = (it.retries || 0) + (r.retries || 0);
  it.data = r.data;
  it.status = 'COMPLETED';
  const base = CHALLENGES[it.id].xp;
  const scale = r.xpScale == null ? 1 : Math.max(0, Math.min(1, r.xpScale));
  it.xp = Math.round((r.acc == null || r.acc >= 50 ? base : base / 2) * scale);
  const before = level(s);
  s.xp += it.xp;
  M.xp = (M.xp || 0) + it.xp;
  record(s, it, 'COMPLETED', r.data);
  recordProgramDay(s, it.id);
  // Only an attempt started from the journey can finish its step, and only once.
  if (it.jn) completePlay(s, it.jn, it.xp);
  // Self-report check-ins give nothing, the same as for points.
  if (!CHALLENGES[it.id].selfReport) addEnergy(s);
  return { xp: it.xp, leveledUp: level(s) > before, newLevel: level(s) };
}

const SEED_LEN = 100;
const seedText = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, SEED_LEN) : '');

/** Keeps only short text and a known challenge, so a saved seed can't carry anything else into a game. */
export function cleanSeed(raw: unknown): Seed | undefined {
  const r = (raw ?? null) as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') return undefined;
  const task = seedText(r.task);
  const step = seedText(r.step);
  const from = typeof r.from === 'string' && Object.hasOwn(CHALLENGES, r.from) ? (r.from as ChallengeId) : undefined;
  const option = typeof r.option === 'string' && /^[a-z_]{1,20}$/.test(r.option) ? r.option : undefined;
  if (!task && !step && !from && !option) return undefined;
  return { ...(task ? { task } : {}), ...(step ? { step } : {}), ...(from ? { from } : {}), ...(option ? { option } : {}) };
}

/** Puts the challenge the user chose to go on to right after the current one, once. */
export function addFollowUp(s: AppState, then: NonNullable<GameResult['then']>) {
  const M = s.mission;
  if (!M || !Object.hasOwn(CHALLENGES, then.id) || CHALLENGES[then.id].retired) return;
  if (M.items[M.idx + 1]?.extra && M.items[M.idx + 1].id === then.id) return;
  const seed = cleanSeed(then.seed);
  M.items.splice(M.idx + 1, 0, {
    id: then.id, why: [], diff: 'normal', extra: 1, ...(seed ? { seed } : {}),
    status: 'NOT_STARTED', retries: 0, xp: 0, acc: null,
  });
}

export function skipItem(s: AppState) {
  const it = currentItem(s)!;
  if (it.status === 'COMPLETED') return;
  clearPause(it);
  it.status = 'SKIPPED';
  it.end = Date.now();
  record(s, it, 'SKIPPED');
}

export function abandonItem(s: AppState) {
  const it = currentItem(s)!;
  if (it.status === 'COMPLETED') return;
  clearPause(it);
  it.status = 'ABANDONED';
  it.end = Date.now();
  record(s, it, 'ABANDONED');
}

export function pauseItem(s: AppState) {
  const it = currentItem(s)!;
  if (it.status === 'IN_PROGRESS') {
    it.status = 'PAUSED';
    it.pauseAt = Date.now();
  }
}

export function resumeItem(s: AppState) {
  const it = currentItem(s)!;
  if (it.status === 'PAUSED') {
    clearPause(it);
    it.status = 'IN_PROGRESS';
  }
}

export function exitMission(s: AppState) {
  const M = s.mission!;
  const it = M.items[M.idx];
  if (it && it.status === 'IN_PROGRESS') {
    it.status = 'PAUSED';
    it.pauseAt = Date.now();
  }
  M.status = 'PAUSED';
  settle(s);
}

export function advance(s: AppState) {
  s.mission!.idx++;
}

export const isPastEnd = (s: AppState) => s.mission!.idx >= s.mission!.items.length;

export function shouldOfferEasier(it: MissionItem, next?: MissionItem): boolean {
  return !!next && (it.retries > 0 || (it.acc != null && it.acc < 60)) && next.diff !== 'easy' && next.id !== 'calm';
}

// Facts only. The words are produced when shown, so a language switch on the summary screen works.
export interface MissionSummary {
  all: boolean;
  doneCount: number;
  total: number;
  xp: number;
  retryId: ChallengeId | null;
  avgAcc: number | null;
  /** Which suggestion to offer: a lighter day, or optionally a harder one. */
  suggestion: 'lighter' | 'harder' | 'quiet';
  /** Self-report only: sharing feelings ends quietly, with no celebration. */
  quiet: boolean;
  solo: boolean;
}

export function summaryLines(m: MissionSummary): string {
  if (m.quiet) return tr(m.doneCount ? 'player.summary.quietDone' : 'player.summary.quietNone');
  const parts = [tr('player.summary.completed', { done: m.doneCount, total: m.total })];
  if (m.retryId) parts.push(tr('player.summary.retried', { name: tr(`challenges.items.${m.retryId}.name`) }));
  if (m.avgAcc != null) parts.push(tr('player.summary.accuracy', { acc: m.avgAcc }));
  return parts.join(tr('common.clauseSep'));
}

export const summarySuggestion = (m: MissionSummary) => tr(`player.summary.suggest.${m.suggestion}`);

export function finishMission(s: AppState): MissionSummary {
  const M = s.mission!;
  markDone(s, M);
  const its = M.items;
  const dn = its.filter((i) => i.status === 'COMPLETED');
  // A challenge the user chose to go on to is a bonus: leaving it doesn't make the mission partial.
  const all = its.every((i) => i.status === 'COMPLETED' || i.extra);
  if (its.every((i) => CHALLENGES[i.id].selfReport)) {
    return { all, doneCount: dn.length, total: its.length, xp: 0, retryId: null, avgAcc: null, suggestion: 'quiet', quiet: true, solo: M.solo };
  }
  const re = dn.filter((i) => i.retries > 0);
  const ac = dn.filter((i) => i.acc != null);
  const sum: MissionSummary = {
    all,
    doneCount: dn.length,
    total: its.length,
    xp: its.reduce((n, i) => n + (i.xp || 0), 0),
    retryId: re[0]?.id ?? null,
    avgAcc: ac.length ? Math.round(ac.reduce((n, i) => n + (i.acc as number), 0) / ac.length) : null,
    suggestion: isLowEnergy(s) || re.length || !all ? 'lighter' : 'harder',
    quiet: false,
    solo: M.solo,
  };
  const head = tr(all ? (M.solo ? 'player.summary.headSolo' : 'player.summary.headDaily') : 'player.summary.headPartial');
  // A chat message is a saved record, so it stays in the language it was written in.
  s.chat.push({ b: 1, t: tr('player.summary.chat', { head, lines: summaryLines(sum), suggestion: summarySuggestion(sum) }) });
  return sum;
}
