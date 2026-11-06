import type { AppState, GameResult, ItemStatus, Mission, MissionItem, PlannedItem } from '../../types';
import { level, today } from '../../utils';
import { CHALLENGES } from '../challenges/catalog';
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
    mid: s.mission!.id, id: it.id, status, acc: it.acc, retries: it.retries, xp: it.xp || 0,
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
  it.xp = r.acc == null || r.acc >= 50 ? base : Math.round(base / 2);
  const before = level(s);
  s.xp += it.xp;
  M.xp = (M.xp || 0) + it.xp;
  record(s, it, 'COMPLETED', r.data);
  return { xp: it.xp, leveledUp: level(s) > before, newLevel: level(s) };
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

export interface MissionSummary {
  all: boolean;
  doneCount: number;
  total: number;
  xp: number;
  lines: string;
  suggestion: string;
  hasRetry: boolean;
}

export function finishMission(s: AppState): MissionSummary {
  const M = s.mission!;
  markDone(s, M);
  const its = M.items;
  const dn = its.filter((i) => i.status === 'COMPLETED');
  const all = dn.length === its.length;
  const re = dn.filter((i) => i.retries > 0);
  const a = [`أكملت ${dn.length} من ${its.length} تحديات`];
  if (re.length) a.push(`وفي "${CHALLENGES[re[0].id].t}" رجعت وحاولت مرة ثانية`);
  const ac = dn.filter((i) => i.acc != null);
  if (ac.length) a.push(`ومتوسط دقتك ${Math.round(ac.reduce((n, i) => n + (i.acc as number), 0) / ac.length)}%`);
  const lines = a.join('، ');
  const suggestion = isLowEnergy(s) || re.length || !all ? 'بكرة نبدأ بتحديات قصيرة ونشوف كيف تحس.' : 'بكرة نقدر نجرب نسخة أصعب شوي، لو تبي.';
  const head = all ? (M.solo ? 'خلصنا التحدي!' : 'خلصنا مهمة اليوم!') : 'انتهت المهمة.';
  s.chat.push({ b: 1, t: `${head} ${lines}. ${suggestion} ودك تسولف معي شوي عن يومك؟` });
  return { all, doneCount: dn.length, total: its.length, xp: its.reduce((n, i) => n + (i.xp || 0), 0), lines, suggestion, hasRetry: re.length > 0 };
}
