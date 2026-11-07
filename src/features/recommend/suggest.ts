import type { AppState, ChallengeId, ChatSuggestion } from '../../types/index.ts';
import { isLowEnergy } from '../mission/planner.ts';
import { recommend } from './engine.ts';
import type { Goal } from './goals.ts';

export interface SuggestInput {
  /** IDs the AI proposed, best first. */
  prefer?: string[];
  goals?: Goal[];
  minutes?: number;
  /** A written reason from the AI, in the reply's language. */
  why?: string;
}

/**
 * Turns a proposal into what the chat card shows: up to three approved activities, the AI's picks first.
 * Every ID goes through the same filters as any other recommendation, so nothing unapproved, too long
 * or marked unhelpful twice can appear. Returns nothing when no activity fits, which is a fine answer.
 */
export function buildSuggestion(s: AppState, input: SuggestInput): ChatSuggestion | undefined {
  if (s.driving) return undefined;
  const prefer = (input.prefer ?? []) as ChallengeId[];
  const ranked = recommend(s, { prefer, goals: input.goals, minutes: input.minutes, low: isLowEnergy(s) });
  if (!ranked.length) return undefined;
  const fromAi = prefer.filter((id) => ranked.some((r) => r.id === id));
  const ids = [...new Set([...fromAi, ...ranked.map((r) => r.id)])].slice(0, 3);
  // A written reason only fits the AI's own first pick. Otherwise the engine's reason code is used.
  const why = input.why && fromAi[0] === ids[0] ? input.why : undefined;
  const first = ranked.find((r) => r.id === ids[0]);
  const goal = first?.why.find((w) => w.k.startsWith('goal_'))?.k;
  return { ids, i: 0, ...(why ? { why } : {}), ...(goal ? { goal } : {}) };
}
