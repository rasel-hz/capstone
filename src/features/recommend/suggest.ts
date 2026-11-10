import type { AppState, ChallengeId, ChatSuggestion } from '../../types/index.ts';
import { isLowEnergy } from '../mission/planner.ts';
import { buildPlanConfig } from '../plan/config.ts';
import { recommend } from './engine.ts';
import type { Goal } from './goals.ts';

export interface SuggestInput {
  /** IDs the AI proposed, best first. */
  prefer?: string[];
  goals?: Goal[];
  minutes?: number;
  /** A written reason from the AI, in the reply's language. */
  why?: string;
  /** Tasks the user mentioned, in their own words, already checked against what they wrote. */
  tasks?: string[];
  /** The user said they're coming from work, so an optional break is offered, clearly marked. */
  afterWork?: boolean;
}

const PLANNING: ChallengeId[] = ['seq', 'breakdown'];

/**
 * Turns a proposal into what the chat card shows: up to three approved activities, the AI's picks first.
 * Every ID goes through the same filters as any other recommendation, so nothing unapproved, too long
 * or marked unhelpful twice can appear. Returns nothing when no activity fits, which is a fine answer.
 *
 * When someone wants to organise their own tasks, the planning board comes first with exactly those
 * tasks. With none named yet, it opens empty so they can add them. It never fills in example tasks.
 */
export function buildSuggestion(s: AppState, input: SuggestInput): ChatSuggestion | undefined {
  if (s.driving) return undefined;
  const tasks = input.tasks ?? [];
  const goals = input.goals ?? [];
  const aiPrefer = (input.prefer ?? []) as ChallengeId[];
  const wantsPlan = goals[0] === 'prioritize' || goals.includes('time') || aiPrefer.some((id) => PLANNING.includes(id));
  // Named tasks always get the personal board. With none named, an empty board is offered unless the AI
  // already picked a specific activity, which is respected.
  const personal = wantsPlan && (tasks.length >= 2 || (!tasks.length && goals.includes('prioritize') && !aiPrefer.length));
  const prefer = personal ? ['seq' as ChallengeId, ...aiPrefer.filter((id) => id !== 'seq')] : aiPrefer;

  const ranked = recommend(s, { prefer, goals, minutes: input.minutes, low: isLowEnergy(s) });
  if (!ranked.length) return undefined;
  const fromAi = prefer.filter((id) => ranked.some((r) => r.id === id));
  const ids = [...new Set([...fromAi, ...ranked.map((r) => r.id)])].slice(0, 3);
  // A written reason only fits the AI's own first pick. Otherwise the engine's reason code is used.
  const why = input.why && aiPrefer[0] === ids[0] ? input.why : undefined;
  const first = ranked.find((r) => r.id === ids[0]);
  const goal = first?.why.find((w) => w.k.startsWith('goal_'))?.k;
  // The user's tasks travel with the card whenever there are some, or when the board opens empty for them.
  const cfg = (personal && ids[0] === 'seq') || tasks.length ? buildPlanConfig(tasks, { minutes: input.minutes, afterWork: input.afterWork }) : undefined;
  return { ids, i: 0, ...(why ? { why } : {}), ...(goal ? { goal } : {}), ...(cfg ? { cfg } : {}) };
}
