import type { AppState, ChallengeId, Difficulty, WhyPart } from '../../types/index.ts';
import { CHALLENGES, JOURNEYS } from '../challenges/catalog.ts';
import { CHALLENGE_META, type Goal } from './goals.ts';

export interface RecOptions {
  /** What the user is trying to do, from their words. Most important first. */
  goals?: Goal[];
  /** Minutes the user said they have. */
  minutes?: number;
  /** Energy is low today (stated by the user). */
  low?: boolean;
  /** IDs the AI or the user asked for, best first. They still pass the same safety filters. */
  prefer?: ChallengeId[];
  exclude?: ChallengeId[];
  now?: number;
}

export interface Recommendation {
  id: ChallengeId;
  score: number;
  diff: Difficulty;
  why: WhyPart[];
}

const DAY = 864e5;

// Net self-reported helpfulness from the last three answers for this challenge.
export function helpfulness(s: AppState, id: ChallengeId): number {
  return (s.fb ?? []).filter((f) => f.id === id).slice(-3).reduce((n, f) => n + f.v, 0);
}

const notForMe = (s: AppState, id: ChallengeId) => {
  const last = (s.fb ?? []).filter((f) => f.id === id).slice(-2);
  return last.length === 2 && last.every((f) => f.v === -1);
};

function lastAccuracy(s: AppState, id: ChallengeId): number | null {
  const a = s.hist.filter((h) => h.id === id && h.acc != null);
  return a.length ? a[a.length - 1].acc : null;
}

/**
 * Explainable ranking of approved challenges. Deterministic filters run first, so nothing outside the
 * catalog, too long for the time given, or marked unhelpful twice can be suggested, even if the AI asked.
 */
export function recommend(s: AppState, o: RecOptions = {}): Recommendation[] {
  const goals = o.goals ?? [];
  const prefer = (o.prefer ?? []).filter((id) => Object.hasOwn(CHALLENGES, id));
  const now = o.now ?? Date.now();
  const playedToday = (id: ChallengeId) => s.hist.filter((h) => h.id === id && h.status === 'COMPLETED' && now - h.ts < DAY).length;

  const out: Recommendation[] = [];
  for (const id of Object.keys(CHALLENGES) as ChallengeId[]) {
    const c = CHALLENGES[id];
    const m = CHALLENGE_META[id];
    const asked = prefer.includes(id);
    const matched = goals.filter((g) => m.goals.includes(g));

    // Eligibility.
    if (o.exclude?.includes(id)) continue;
    if (o.minutes != null && c.min > o.minutes) continue;
    if (m.onRequest && !asked && !(goals[0] && m.goals[0] === goals[0])) continue;
    if (!asked && notForMe(s, id)) continue;
    if (o.low && !m.gentle && c.min > 2 && !asked) continue;
    if ((goals.length || prefer.length) && !matched.length && !asked) continue;

    // Ranking.
    let score = 0;
    goals.forEach((g, gi) => {
      if (m.goals.includes(g)) score += Math.max(1, 4 - gi) + (m.goals[0] === g ? 1 : 0);
    });
    if (asked) score += 6 - Math.min(5, prefer.indexOf(id));
    const help = helpfulness(s, id);
    score += help * 2;
    score -= playedToday(id);
    if (o.low && m.gentle) score += 2;
    if (JOURNEYS.some((j) => s.needs.includes(j.id) && j.id !== 'gen' && j.a.includes(id))) score += 1;

    // Reasons, from what was actually said or recorded.
    const why: WhyPart[] = [];
    if (matched[0]) why.push({ k: `goal_${matched[0]}` });
    if (help > 0) why.push({ k: 'helped' });
    if (o.low && m.gentle) why.push({ k: 'gentle' });
    if (o.minutes != null) why.push({ k: 'fits', n: o.minutes });

    const last = lastAccuracy(s, id);
    const diff: Difficulty = c.hasEasy && (o.low || (last != null && last < 60)) ? 'easy' : 'normal';
    out.push({ id, score, diff, why });
  }
  // Stable sort keeps catalog order for ties, so results are predictable.
  return out.sort((a, b) => b.score - a.score);
}
