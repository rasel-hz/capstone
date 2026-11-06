import type { AppState } from '../../types';
import { level } from '../../utils';

export function achievements(s: AppState): { label: string; earned: boolean }[] {
  const H = s.hist.filter((h) => h.status === 'COMPLETED');
  return [
    { label: 'أول خطوة', earned: H.length >= 1 },
    { label: 'خمس تحديات', earned: H.length >= 5 },
    { label: 'المستوى ٢', earned: level(s) >= 2 },
    { label: 'جربت ٣ ألعاب مختلفة', earned: new Set(H.map((h) => h.id)).size >= 3 },
    { label: 'رجعت وحاولت مرة ثانية', earned: H.some((h) => h.retries > 0) },
    { label: 'رجعة حلوة بعد غياب', earned: !!s.comeback && H.length > 0 },
  ];
}

export const UNLOCKS = [
  { label: 'ثيم لافندر', level: 3, theme: 'lilac' },
  { label: 'قبعة لخويّك', level: 4, theme: '' },
];
