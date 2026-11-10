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
  /**
   * Dhikr: only when the user or the companion asks for it by name, and only at a fitting time of day.
   * Never picked on its own, so feeling stressed doesn't bring a dhikr suggestion every time.
   */
  dhikr?: boolean;
}

// Which everyday goals each challenge supports. See docs/CHALLENGES.md for purposes and limits.
// Retired challenges keep an entry but are never recommended.
// These are support and practice, not treatment, and say nothing about anyone's health.
export const CHALLENGE_META: Record<ChallengeId, ChallengeMeta> = {
  priority_board: { goals: ['prioritize'] },
  breakdown: { goals: ['start', 'prioritize', 'time'] },
  micro_start: { goals: ['start', 'time'], gentle: true },
  start2: { goals: ['start'], gentle: true },
  thought_sort: { goals: ['worry', 'prioritize'] },
  study_sprint: { goals: ['focus', 'start', 'time'] },
  seq: { goals: ['social', 'prioritize'] },
  video: { goals: ['focus'] },
  attention_scene: { goals: ['focus'] },
  mem: { goals: ['memory', 'focus'] },
  time: { goals: ['time'], gentle: true },
  calm: { goals: ['stress', 'sleep', 'worry'], gentle: true },
  calm_landscape: { goals: ['rest', 'stress', 'sleep'], gentle: true },
  emotion_map: { goals: ['worry'], onRequest: true, gentle: true },
  dhikr_morning: { goals: ['rest'], gentle: true, dhikr: true },
  dhikr_evening: { goals: ['rest'], gentle: true, dhikr: true },
  dhikr_calm_heart: { goals: ['worry', 'stress'], gentle: true, dhikr: true },
  dhikr_moment: { goals: ['rest', 'stress'], gentle: true, dhikr: true },
  dhikr_sleep: { goals: ['sleep'], gentle: true, dhikr: true },
  eye_break: { goals: ['rest', 'focus'], gentle: true },
  eye_rest: { goals: ['rest', 'focus'], gentle: true },
  grounding: { goals: ['worry', 'stress'], gentle: true },
};

export const isGoal = (v: unknown): v is Goal => typeof v === 'string' && (GOALS as readonly string[]).includes(v);
