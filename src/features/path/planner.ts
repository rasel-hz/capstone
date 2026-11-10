import type { AppState, ChallengeId, PlannedItem } from '../../types/index.ts';
import { CHALLENGES } from '../challenges/catalog.ts';
import { buildPlanConfig, type PlanConfig } from '../plan/config.ts';
import { CHALLENGE_META, type Goal } from '../recommend/goals.ts';
import { lastFeedback, recommend } from '../recommend/engine.ts';
import { isDhikr } from '../dhikr/content.ts';
import { effectiveId, pickDhikr } from '../dhikr/pick.ts';
import { mainGoal, type GoalId, type LifeProfile } from '../profile/questions.ts';

// The personal journey: small steps chosen from what the user said. Deterministic, so it can be tested and
// explained. Only challenges that really exist can appear. Progress is recorded only from verified completion.

export type NodeKind = 'play' | 'talk' | 'reflect' | 'milestone';
export interface PathNode {
  key: string;
  kind: NodeKind;
  id?: ChallengeId;
  /** Chapter, from 0. */
  ch: number;
  /** When it was really done, and the XP actually earned. Absent means not done. */
  done?: { at: number; xp: number };
  cfg?: PlanConfig;
}
export type ThemeId = GoalId | 'study' | 'work' | 'gentle';
export interface PathPlan {
  v: 1;
  /** One theme per chapter. */
  themes: ThemeId[];
  nodes: PathNode[];
  created: number;
  /** The last finished node already celebrated on the map. */
  seen?: string;
  /** When the plan last changed, so the newest copy wins between devices. */
  updated?: number;
  /** The last change made from the chat, so the same request doesn't rewrite the journey again. */
  adapted?: { goal: Goal; at: number };
}

const BASE: Record<GoalId, ChallengeId[]> = {
  organize: ['breakdown', 'micro_start', 'thought_sort', 'calm_landscape'],
  focus: ['attention_scene', 'video', 'mem', 'calm_landscape', 'eye_rest'],
  start: ['micro_start', 'breakdown', 'study_sprint', 'calm_landscape'],
  stress: ['calm_landscape', 'thought_sort', 'calm', 'grounding', 'micro_start'],
  sleep: ['calm_landscape', 'calm', 'thought_sort', 'emotion_map'],
  social: ['thought_sort', 'calm', 'micro_start', 'emotion_map'],
  habits: ['micro_start', 'breakdown', 'study_sprint', 'calm_landscape'],
  other: ['micro_start', 'calm_landscape', 'breakdown', 'calm'],
};
const GENTLE: ChallengeId[] = ['calm_landscape', 'micro_start', 'calm', 'breakdown'];
const ACTS = 4;

const student = (p: LifeProfile) => p.life.includes('school') || p.life.includes('uni') || p.life.includes('both');
const worker = (p: LifeProfile) => p.life.includes('work') || p.life.includes('both');
const toFront = (a: ChallengeId[], id: ChallengeId) => [id, ...a.filter((x) => x !== id)];

function themeFor(p: LifeProfile, goal: GoalId | null): ThemeId {
  if (!goal) return 'gentle';
  if ((goal === 'organize' || goal === 'start' || goal === 'focus') && student(p)) return 'study';
  if (goal === 'organize' && worker(p)) return 'work';
  return goal;
}

function chooseActs(p: LifeProfile, goal: GoalId | null, avoid: ChallengeId[] = []): ChallengeId[] {
  let a = [...(goal ? BASE[goal] : GENTLE)];
  // Study practice only for someone who said they study.
  if (student(p) && (goal === 'organize' || goal === 'start' || goal === 'focus')) a = [...a.slice(0, 2), 'study_sprint', ...a.slice(2)];
  // Arranging the day works only on the user's own tasks, so it comes in only when they named some.
  if (p.tasks.length >= 2 && (goal === 'organize' || goal === 'start' || goal === 'social')) a = toFront(a, 'seq');
  if (p.hard.includes('thoughts') && !a.includes('thought_sort') && goal !== 'focus') a.splice(2, 0, 'thought_sort');
  if (p.style.includes('calm')) a = toFront(a.includes('calm_landscape') ? a : [...a, 'calm_landscape'], 'calm_landscape');
  if (p.style.includes('steps')) {
    const plan = a.find((x) => x === 'seq' || x === 'breakdown');
    if (plan) a = toFront(a, plan);
  }
  // Someone worn out starts with something gentle.
  if (p.hard.includes('tired') && !CHALLENGE_META[a[0]].gentle) {
    const g = a.find((x) => CHALLENGE_META[x].gentle);
    if (g) a = toFront(a, g);
  }
  // Anything the user's latest answer says didn't suit them is left out, as long as something else remains.
  const kept = a.filter((x) => !avoid.includes(x));
  return [...new Set(kept.length >= 2 ? kept : a)].slice(0, ACTS);
}

function chapterNodes(acts: ChallengeId[], ch: number, talkFirst: boolean, cfg?: PlanConfig): PathNode[] {
  const out: PathNode[] = [];
  if (talkFirst) out.push({ key: `c${ch}-talk`, kind: 'talk', ch });
  acts.forEach((id, i) => out.push({ key: `c${ch}-${i}-${id}`, kind: 'play', id, ch, ...((id === 'seq' || id === 'micro_start') && cfg ? { cfg } : {}) }));
  out.push({ key: `c${ch}-reflect`, kind: 'reflect', ch }, { key: `c${ch}-mile`, kind: 'milestone', ch });
  return out;
}

export function buildPlan(p: LifeProfile, now = Date.now(), avoid: ChallengeId[] = []): PathPlan {
  const goal = mainGoal(p);
  const first = chooseActs(p, goal, avoid);
  const cfg = p.tasks.length ? buildPlanConfig(p.tasks) : undefined;
  const nodes = chapterNodes(first, 0, p.style.includes('talk'), cfg);
  const next = p.goals.find((g) => g !== goal) ?? (goal === 'stress' || goal === 'sleep' ? 'habits' : goal ? 'stress' : 'habits');
  const second = chooseActs({ ...p, style: [] }, next, avoid).filter((id) => !first.includes(id));
  const fill = (second.length >= 2 ? second : [...second, ...GENTLE.filter((x) => !first.includes(x))]).slice(0, 3);
  if (fill.length) nodes.push(...chapterNodes([...new Set(fill)], 1, false, cfg));
  return { v: 1, themes: [themeFor(p, goal), themeFor(p, next)], nodes, created: now, updated: now };
}

/** The step to do now, or null when everything is finished. */
export const currentNode = (plan: PathPlan | null): PathNode | null => plan?.nodes.find((n) => !n.done) ?? null;

export type NodeState = 'done' | 'current' | 'locked';
export function nodeState(plan: PathPlan, n: PathNode): NodeState {
  if (n.done) return 'done';
  return currentNode(plan)?.key === n.key ? 'current' : 'locked';
}

export const potentialXp = (n: PathNode) => (n.kind === 'play' && n.id ? CHALLENGES[n.id].xp : 0);
export const earnedXp = (plan: PathPlan) => plan.nodes.reduce((t, n) => t + (n.done?.xp ?? 0), 0);

function finish(s: AppState, key: string, xp: number, now: number): boolean {
  const plan = s.path;
  const cur = currentNode(plan);
  if (!plan || !cur || cur.key !== key) return false;
  cur.done = { at: now, xp };
  plan.updated = now;
  // A milestone is reached by finishing what comes before it, and is worth no extra XP.
  const nxt = currentNode(plan);
  if (nxt?.kind === 'milestone') nxt.done = { at: now, xp: 0 };
  return true;
}

/** Called only from verified game completion. A step finishes once; replays and repeats do nothing. */
export const completePlay = (s: AppState, key: string, xp: number, now = Date.now()) => finish(s, key, xp, now);

export function completeReflect(s: AppState, key: string, now = Date.now()) {
  const cur = currentNode(s.path);
  return cur?.kind === 'reflect' && cur.key === key ? finish(s, key, 0, now) : false;
}

/** A talk step is done only when the user really sends a message. */
export function completeTalk(s: AppState, now = Date.now()) {
  const cur = currentNode(s.path);
  return cur?.kind === 'talk' ? finish(s, cur.key, 0, now) : false;
}

export function pathItem(s: AppState, n: PathNode, now = new Date()): PlannedItem {
  // A timed dhikr step opens the one that fits the time now; the saved step stays as it was.
  const id = effectiveId(n.id!, now);
  const low = s.en.length > 0 && s.en[s.en.length - 1].e === 'low';
  return { id, why: [{ k: 'path' }], diff: CHALLENGES[id].hasEasy && low ? 'easy' : 'normal', jn: n.key, ...(n.cfg ? { cfg: n.cfg } : {}) };
}

/** A revised plan keeps everything already done, and replaces only what hasn't happened yet. */
export function replan(old: PathPlan | null, p: LifeProfile, now = Date.now(), avoid: ChallengeId[] = []): PathPlan {
  const fresh = buildPlan(p, now, avoid);
  if (!old) return fresh;
  const kept = old.nodes.filter((n) => n.done);
  if (!kept.length) return fresh;
  const lastCh = Math.max(...kept.map((n) => n.ch));
  const shift = lastCh + 1;
  const next = fresh.nodes.map((n) => ({ ...n, ch: n.ch + shift, key: `r${now.toString(36)}-${n.key}` }));
  return { v: 1, themes: [...old.themes.slice(0, shift), ...fresh.themes], nodes: [...kept, ...next], created: old.created, seen: old.seen, updated: now };
}

/** Adds one more chapter when the journey is finished. */
export function extendPlan(s: AppState, p: LifeProfile | null, now = Date.now()) {
  const plan = s.path;
  if (!plan || currentNode(plan)) return;
  const ch = Math.max(...plan.nodes.map((n) => n.ch)) + 1;
  const recent = plan.nodes.slice(-8).flatMap((n) => (n.id ? [n.id] : []));
  const goal = p ? mainGoal(p) : null;
  const pool = [...(goal ? BASE[goal] : GENTLE), ...GENTLE];
  const avoid = avoidOf(s);
  const fresh = pool.filter((x) => !avoid.includes(x));
  const acts = [...new Set((fresh.length >= 3 ? fresh : pool).filter((x) => !recent.includes(x)).concat(fresh.length >= 3 ? fresh : pool))].slice(0, 3);
  plan.themes = [...plan.themes, plan.themes[0]];
  plan.nodes.push(...chapterNodes(acts, ch, false).map((n) => ({ ...n, key: `x${now.toString(36)}-${n.key}` })));
  plan.updated = now;
}

/** The journey as shown now: upcoming timed dhikr steps show the one that fits the current time. */
export const timedView = (plan: PathPlan, now = new Date()): PathPlan =>
  ({ ...plan, nodes: plan.nodes.map((n) => (n.done || !n.id ? n : { ...n, id: effectiveId(n.id, now) })) });

/** Challenges whose latest answer from the user was "didn't suit me". */
export const avoidOf = (s: AppState): ChallengeId[] =>
  [...new Set((s.fb ?? []).map((f) => f.id))].filter((id) => lastFeedback(s, id)?.v === -1);

// A need from the chat, as the journey's chapter theme.
const THEME_OF: Record<Goal, ThemeId> = {
  prioritize: 'organize', time: 'organize', start: 'start', focus: 'focus', memory: 'focus',
  stress: 'stress', worry: 'stress', sleep: 'sleep', social: 'social', rest: 'gentle',
};
/** Asking for the same change again within this time leaves the journey as it is. */
export const ADAPT_COOLDOWN = 12 * 3600e3;

export interface JourneyChange {
  goal: Goal;
  /** Steps that were swapped, in order. Empty when only a dhikr step was added. */
  swapped: { from: ChallengeId; to: ChallengeId }[];
  dhikr?: ChallengeId;
}

/**
 * Adjusts the journey towards a need the user described, without rebuilding it. Only upcoming steps of the
 * current chapter change: finished steps, their XP, the number of steps and the chapter structure stay.
 * Steps that already fit the need are kept, and at most two are swapped, for existing challenges the
 * recommendation engine approves for that need (so retired ones, ones the user disliked and dhikr outside
 * its time never come in). A dhikr step is added only when asked for, chosen by the user's local time.
 * Returns null when nothing would change, so nothing is claimed.
 */
export function adaptJourney(s: AppState, goal: Goal, o: { dhikr?: boolean; now?: number } = {}): { plan: PathPlan; change: JourneyChange } | null {
  const now = o.now ?? Date.now();
  const cur = currentNode(s.path);
  if (!s.path || !cur) return null;
  if (s.path.adapted?.goal === goal && now - s.path.adapted.at < ADAPT_COOLDOWN && !o.dhikr) return null;
  const plan: PathPlan = structuredClone(s.path);
  const chapter = cur.ch;
  const upcoming = plan.nodes.filter((n) => !n.done && n.kind === 'play' && n.ch === chapter && n.id);
  if (!upcoming.length) return null;
  const present = new Set(plan.nodes.filter((n) => !n.done && n.id).map((n) => n.id!));
  const fits = (id: ChallengeId) => CHALLENGE_META[id].goals.includes(goal);
  // Approved by the engine for this need: active, not disliked, and dhikr never comes in this way.
  const approved: ChallengeId[] = recommend(s, { goals: [goal], now }).map((r) => r.id).filter((id) => !isDhikr(id));
  // A fitting step already planned for a later chapter is moved forward, so nothing is duplicated.
  const later = plan.nodes.filter((n) => !n.done && n.kind === 'play' && n.ch > chapter && n.id && approved.includes(n.id) && fits(n.id));
  const options = approved.filter((id) => !present.has(id));
  const swapped: JourneyChange['swapped'] = [];
  for (const n of upcoming) {
    if (swapped.length >= 2) break;
    if (fits(n.id!) || isDhikr(n.id!)) continue;
    const from = n.id!;
    const moved = later.shift();
    let to: ChallengeId;
    if (moved) {
      to = moved.id!;
      // The two steps trade places: the later chapter keeps the same number of steps.
      moved.id = from;
      moved.key = `${moved.key}~m${now.toString(36)}${swapped.length + 1}`;
      delete moved.cfg;
    } else if (options.length) {
      to = options.shift()!;
    } else break;
    swapped.push({ from, to });
    n.id = to;
    n.key = `${n.key}~a${now.toString(36)}${swapped.length}`;
    delete n.cfg;
  }
  let dhikr: ChallengeId | undefined;
  if (o.dhikr && !plan.nodes.some((n) => !n.done && n.id && isDhikr(n.id))) {
    const spot = [...upcoming].reverse().find((n) => !swapped.some((w) => w.to === n.id)) ?? upcoming[upcoming.length - 1];
    dhikr = pickDhikr(new Date(now), goal);
    spot.id = dhikr;
    spot.key = `${spot.key}~d${now.toString(36)}`;
    delete spot.cfg;
  }
  if (!swapped.length && !dhikr) return null;
  plan.themes[chapter] = THEME_OF[goal];
  plan.adapted = { goal, at: now };
  plan.updated = now;
  return { plan, change: { goal, swapped: swapped.filter((w) => plan.nodes.some((n) => n.id === w.to)), ...(dhikr ? { dhikr } : {}) } };
}

/** Checks a saved plan. A malformed node drops the plan rather than showing false progress. */
export function validPlan(raw: unknown): PathPlan | null {
  const r = raw as PathPlan | null;
  if (!r || r.v !== 1 || !Array.isArray(r.nodes) || !Array.isArray(r.themes)) return null;
  const ok = r.nodes.every((n) => n && typeof n.key === 'string' && ['play', 'talk', 'reflect', 'milestone'].includes(n.kind) && (n.kind !== 'play' || (!!n.id && Object.hasOwn(CHALLENGES, n.id))));
  return ok ? r : null;
}
