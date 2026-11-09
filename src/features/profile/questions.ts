import type { AppState, JourneyId } from '../../types/index.ts';
import { MAX_TASKS, MAX_TASK_LEN } from '../plan/config.ts';

// Onboarding questions. Which ones appear follows from the earlier answers, and everything is optional.
// Answers are what the user said about themselves, nothing more. They never imply a schedule or a condition.

export const LIFE = ['school', 'uni', 'work', 'both', 'flex', 'other', 'skip'] as const;
export const GOALS = ['organize', 'focus', 'start', 'stress', 'sleep', 'social', 'habits', 'other'] as const;
export const WHEN = ['after_class', 'after_work', 'bedtime', 'stress', 'free', 'suggest'] as const;
export const SLEEP = ['regular', 'late', 'varies', 'skip'] as const;
export const HARD = ['tasks', 'focus', 'delay', 'thoughts', 'tired', 'other', 'skip'] as const;
export const STYLE = ['games', 'steps', 'talk', 'calm', 'auto', 'unsure'] as const;

export type LifeId = (typeof LIFE)[number];
export type GoalId = (typeof GOALS)[number];
export type WhenId = (typeof WHEN)[number];
export type SleepId = (typeof SLEEP)[number];
export type HardId = (typeof HARD)[number];
export type StyleId = (typeof STYLE)[number];

export interface LifeProfile {
  v: 1;
  life: LifeId[];
  goals: GoalId[];
  primary: GoalId | null;
  /** The user's own wording. Kept only if they ticked the box to keep it. */
  tasks: string[];
  when: WhenId[];
  /** No longer asked. Kept so answers saved earlier still shape the journey and the chat. */
  sleep: SleepId | null;
  /** No longer asked. Kept for the same reason. */
  hard: HardId[];
  style: StyleId | null;
  at: number;
}

export const emptyProfile = (): LifeProfile => ({ v: 1, life: [], goals: [], primary: null, tasks: [], when: [], sleep: null, hard: [], style: null, at: 0 });

export type QuestionId = 'life' | 'goals' | 'primary' | 'tasks' | 'when' | 'style';

const isStudent = (p: Pick<LifeProfile, 'life'>) => p.life.includes('school') || p.life.includes('uni');
const isWorker = (p: Pick<LifeProfile, 'life'>) => p.life.includes('work');
const isBoth = (p: Pick<LifeProfile, 'life'>) => p.life.includes('both') || (isStudent(p) && isWorker(p));

/** The questions to ask, in order, given the answers so far. */
export function questionsFor(p: LifeProfile): QuestionId[] {
  const q: QuestionId[] = ['life', 'goals'];
  if (p.goals.length > 1) q.push('primary');
  if (p.goals.some((g) => g === 'organize' || g === 'start' || g === 'focus' || g === 'habits') || isStudent(p) || isBoth(p)) q.push('tasks');
  q.push('when', 'style');
  return q;
}

/** The stepper group each question belongs to. */
export function groupOf(q: QuestionId): 0 | 1 | 2 | 3 {
  if (q === 'life') return 0;
  if (q === 'goals' || q === 'primary' || q === 'tasks') return 1;
  if (q === 'when') return 2;
  return 3;
}

/** Choices for a question. Options that can't apply to this person aren't shown. */
export function optionsFor(q: QuestionId, p: LifeProfile): readonly string[] {
  switch (q) {
    case 'life': return LIFE;
    case 'goals': return GOALS;
    case 'primary': return p.goals;
    case 'style': return STYLE;
    case 'tasks': return [];
    default: return WHEN.filter((w) => (w !== 'after_class' || isStudent(p) || isBoth(p)) && (w !== 'after_work' || isWorker(p) || isBoth(p)));
  }
}

export const isMulti = (q: QuestionId) => q === 'life' || q === 'goals' || q === 'when';
/** Options that mean "none of this", so picking one clears the rest. */
export const EXCLUSIVE = ['skip'];

/** A suggested time from what the user actually said, or null when there isn't enough to go on. */
export function suggestWhen(p: LifeProfile): 'after_work' | 'after_class' | 'bedtime' | null {
  if (p.primary === 'sleep' || (p.goals.length === 1 && p.goals[0] === 'sleep')) return 'bedtime';
  if (isWorker(p) || p.life.includes('both')) return 'after_work';
  if (isStudent(p)) return 'after_class';
  return null;
}

/** Picks the main goal when several were chosen and none was marked. */
export const mainGoal = (p: LifeProfile): GoalId | null => (p.primary && p.goals.includes(p.primary) ? p.primary : p.goals[0] ?? null);

const only = <T extends string>(v: unknown, allowed: readonly T[]): T[] => [...new Set((Array.isArray(v) ? v : []).filter((x): x is T => allowed.includes(x as T)))];
const one = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);
const cleanTask = (t: unknown) => (typeof t === 'string' ? t.replace(/\s+/g, ' ').trim().slice(0, MAX_TASK_LEN) : '');

/** Checks saved answers. Anything unknown is dropped, so a bad value can't reach the planner. */
export function validProfile(raw: unknown): LifeProfile | null {
  const r = raw as Partial<LifeProfile> | null;
  if (!r || r.v !== 1) return null;
  const goals = only(r.goals, GOALS);
  const primary = one(r.primary, GOALS);
  return {
    v: 1, life: only(r.life, LIFE), goals, primary: primary && goals.includes(primary) ? primary : null,
    tasks: [...new Set((Array.isArray(r.tasks) ? r.tasks : []).map(cleanTask).filter(Boolean))].slice(0, MAX_TASKS),
    when: only(r.when, WHEN), sleep: one(r.sleep, SLEEP), hard: only(r.hard, HARD), style: one(r.style, STYLE),
    at: typeof r.at === 'number' ? r.at : 0,
  };
}

/** Fills the older settings the rest of the app reads. A goal is never turned into a condition. */
export function toLegacy(p: LifeProfile): Pick<AppState, 'sched' | 'sleep' | 'needs'> {
  const sched = isWorker(p) || p.life.includes('both') ? 'work' : isStudent(p) ? 'study' : 'flex';
  const sleep = p.sleep === 'late' ? 'late' : p.sleep === 'regular' ? 'early' : 'skip';
  const needs = new Set<JourneyId>();
  for (const g of p.goals) {
    if (g === 'organize' || g === 'focus' || g === 'start') needs.add('adhd'); // Shown as "Focus & Organization"; only a label for these goals.
    if (g === 'sleep') needs.add('sleep');
    if (g === 'social') needs.add('soc');
  }
  return { sched, sleep, needs: needs.size ? [...needs] : ['gen'] };
}
