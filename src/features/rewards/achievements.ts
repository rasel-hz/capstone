import type { AppState } from '../../types';
import { level } from '../../utils';
import { CHALLENGES } from '../challenges/catalog';

export type AchievementArt = 'step' | 'five' | 'level' | 'variety' | 'retry' | 'return';

export function achievements(s: AppState): { art: AchievementArt; earned: boolean }[] {
  // Self-report never counts, so sharing feelings is never rewarded (reference 14.2).
  const H = s.hist.filter((h) => h.status === 'COMPLETED' && !CHALLENGES[h.id].selfReport);
  return [
    { art: 'step', earned: H.length >= 1 },
    { art: 'five', earned: H.length >= 5 },
    { art: 'level', earned: level(s) >= 2 },
    { art: 'variety', earned: new Set(H.map((h) => h.id)).size >= 3 },
    { art: 'retry', earned: H.some((h) => h.retries > 0) },
    { art: 'return', earned: !!s.comeback && H.length > 0 },
  ];
}

export const UNLOCKS = [
  { id: 'theme', level: 3, theme: 'lilac' },
  { id: 'hat', level: 4, theme: '' },
];
