import type { AppState } from '../../types';
import { level } from '../../utils';
import { CHALLENGES } from '../challenges/catalog';

export type AchievementArt = 'step' | 'five' | 'level' | 'variety' | 'retry' | 'return';

export function achievements(s: AppState): { label: string; hint: string; art: AchievementArt; earned: boolean }[] {
  // Self-report never counts, so sharing feelings is never rewarded (reference 14.2).
  const H = s.hist.filter((h) => h.status === 'COMPLETED' && !CHALLENGES[h.id].selfReport);
  return [
    { label: 'أول خطوة', hint: 'كمّل أول تحدي', art: 'step', earned: H.length >= 1 },
    { label: 'خمس تحديات', hint: 'كمّل ٥ تحديات', art: 'five', earned: H.length >= 5 },
    { label: 'المستوى ٢', hint: 'اجمع ١٠٠ نقطة', art: 'level', earned: level(s) >= 2 },
    { label: 'جربت ٣ ألعاب مختلفة', hint: 'جرّب ٣ تحديات مختلفة', art: 'variety', earned: new Set(H.map((h) => h.id)).size >= 3 },
    { label: 'رجعت وحاولت مرة ثانية', hint: 'حاول مرة ثانية بعد إجابة غلط', art: 'retry', earned: H.some((h) => h.retries > 0) },
    { label: 'رجعة حلوة بعد غياب', hint: 'ارجع بعد راحة وكمّل تحدي', art: 'return', earned: !!s.comeback && H.length > 0 },
  ];
}

export const UNLOCKS = [
  { label: 'ثيم لافندر', level: 3, theme: 'lilac' },
  { label: 'قبعة لخويّك', level: 4, theme: '' },
];
