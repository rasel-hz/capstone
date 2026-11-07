import type { ChallengeId } from '../../types/index.ts';

// What a user can be trying to do, in their own terms. Never a condition or a diagnosis.
export const GOALS = ['prioritize', 'start', 'focus', 'stress', 'sleep', 'worry', 'social', 'rest', 'memory', 'time'] as const;
export type Goal = (typeof GOALS)[number];

export interface ChallengeMeta {
  /** Goals this challenge can support, most fitting first. */
  goals: Goal[];
  /** Offered only when the user asks for it or names a matching goal, never as a default. */
  onRequest?: boolean;
  /** Fine to suggest when energy is low. */
  gentle?: boolean;
}

// Which everyday goals each challenge supports. See docs/CHALLENGES.md for purposes and limits.
// These are support and practice, not treatment, and say nothing about anyone's health.
export const CHALLENGE_META: Record<ChallengeId, ChallengeMeta> = {
  priority_board: { goals: ['prioritize'] },
  breakdown: { goals: ['start', 'prioritize'] },
  micro_start: { goals: ['start'], gentle: true },
  start2: { goals: ['start'], gentle: true },
  thought_sort: { goals: ['worry', 'prioritize'] },
  study_sprint: { goals: ['focus', 'start'] },
  seq: { goals: ['social', 'prioritize'] },
  video: { goals: ['focus'] },
  attention_scene: { goals: ['focus'] },
  mem: { goals: ['memory', 'focus'] },
  time: { goals: ['time'], gentle: true },
  calm: { goals: ['stress', 'sleep', 'worry'], gentle: true },
  calm_landscape: { goals: ['rest', 'stress', 'sleep'], gentle: true },
  emotion_map: { goals: ['worry'], onRequest: true, gentle: true },
};

export const isGoal = (v: unknown): v is Goal => typeof v === 'string' && (GOALS as readonly string[]).includes(v);
