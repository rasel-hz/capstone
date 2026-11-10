import type { AppState, ChallengeId, PlannedItem } from '../../types/index.ts';
import { CHALLENGES } from '../challenges/catalog.ts';
import { buildPlanConfig, type PlanConfig } from '../plan/config.ts';
import { CHALLENGE_META } from '../recommend/goals.ts';
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

function chooseActs(p: LifeProfile, goal: GoalId | null): ChallengeId[] {
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
  return [...new Set(a)].slice(0, ACTS);
}

function chapterNodes(acts: ChallengeId[], ch: number, talkFirst: boolean, cfg?: PlanConfig): PathNode[] {
  const out: PathNode[] = [];
  if (talkFirst) out.push({ key: `c${ch}-talk`, kind: 'talk', ch });
  acts.forEach((id, i) => out.push({ key: `c${ch}-${i}-${id}`, kind: 'play', id, ch, ...((id === 'seq' || id === 'micro_start') && cfg ? { cfg } : {}) }));
  out.push({ key: `c${ch}-reflect`, kind: 'reflect', ch }, { key: `c${ch}-mile`, kind: 'milestone', ch });
  return out;
}

export function buildPlan(p: LifeProfile, now = Date.now()): PathPlan {
  const goal = mainGoal(p);
  const first = chooseActs(p, goal);
  const cfg = p.tasks.length ? buildPlanConfig(p.tasks) : undefined;
  const nodes = chapterNodes(first, 0, p.style.includes('talk'), cfg);
  const next = p.goals.find((g) => g !== goal) ?? (goal === 'stress' || goal === 'sleep' ? 'habits' : goal ? 'stress' : 'habits');
  const second = chooseActs({ ...p, style: [] }, next).filter((id) => !first.includes(id));
  const fill = (second.length >= 2 ? second : [...second, ...GENTLE.filter((x) => !first.includes(x))]).slice(0, 3);
  if (fill.length) nodes.push(...chapterNodes([...new Set(fill)], 1, false, cfg));
  return { v: 1, themes: [themeFor(p, goal), themeFor(p, next)], nodes, created: now };
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

export function pathItem(s: AppState, n: PathNode): PlannedItem {
  const id = n.id!;
  const low = s.en.length > 0 && s.en[s.en.length - 1].e === 'low';
  return { id, why: [{ k: 'path' }], diff: CHALLENGES[id].hasEasy && low ? 'easy' : 'normal', jn: n.key, ...(n.cfg ? { cfg: n.cfg } : {}) };
}

/** A revised plan keeps everything already done, and replaces only what hasn't happened yet. */
export function replan(old: PathPlan | null, p: LifeProfile, now = Date.now()): PathPlan {
  const fresh = buildPlan(p, now);
  if (!old) return fresh;
  const kept = old.nodes.filter((n) => n.done);
  if (!kept.length) return fresh;
  const lastCh = Math.max(...kept.map((n) => n.ch));
  const shift = lastCh + 1;
  const next = fresh.nodes.map((n) => ({ ...n, ch: n.ch + shift, key: `r${now.toString(36)}-${n.key}` }));
  return { v: 1, themes: [...old.themes.slice(0, shift), ...fresh.themes], nodes: [...kept, ...next], created: old.created, seen: old.seen };
}

/** Adds one more chapter when the journey is finished. */
export function extendPlan(s: AppState, p: LifeProfile | null, now = Date.now()) {
  const plan = s.path;
  if (!plan || currentNode(plan)) return;
  const ch = Math.max(...plan.nodes.map((n) => n.ch)) + 1;
  const recent = plan.nodes.slice(-8).flatMap((n) => (n.id ? [n.id] : []));
  const goal = p ? mainGoal(p) : null;
  const pool = [...(goal ? BASE[goal] : GENTLE), ...GENTLE];
  const acts = [...new Set(pool.filter((x) => !recent.includes(x)).concat(pool))].slice(0, 3);
  plan.themes = [...plan.themes, plan.themes[0]];
  plan.nodes.push(...chapterNodes(acts, ch, false).map((n) => ({ ...n, key: `x${now.toString(36)}-${n.key}` })));
}

/** Checks a saved plan. A malformed node drops the plan rather than showing false progress. */
export function validPlan(raw: unknown): PathPlan | null {
  const r = raw as PathPlan | null;
  if (!r || r.v !== 1 || !Array.isArray(r.nodes) || !Array.isArray(r.themes)) return null;
  const ok = r.nodes.every((n) => n && typeof n.key === 'string' && ['play', 'talk', 'reflect', 'milestone'].includes(n.kind) && (n.kind !== 'play' || (!!n.id && Object.hasOwn(CHALLENGES, n.id))));
  return ok ? r : null;
}
