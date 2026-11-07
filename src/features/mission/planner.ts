import type { AppState, ChallengeId, PlannedItem } from '../../types';
import { today } from '../../utils';
import { JOURNEYS } from '../challenges/catalog';

export function isLowEnergy(s: AppState): boolean {
  const e = s.en[s.en.length - 1];
  return !!(e && e.d === today() && e.e === 'low') || s.pref === 'short';
}

export function inPrayerWindow(s: AppState, now = new Date()): boolean {
  if (!s.prayer || !s.pp) return false;
  const [h, m] = s.prayer.split(':').map(Number);
  const x = now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
  return x >= -2 && x < s.pp;
}

export function lastAccuracy(s: AppState, id: ChallengeId): number | null {
  const a = s.hist.filter((h) => h.id === id && h.acc != null);
  return a.length ? a[a.length - 1].acc : null;
}

const DEFAULT_WHY: Partial<Record<ChallengeId, string>> = {
  video: 'نبدأ بتركيز قصير',
  mem: 'بعد التركيز، جولة ذاكرة خفيفة',
  time: 'نختم بتمرين صغير على تقدير الوقت',
  start2: 'نختم بخطوة صغيرة في مهمة حقيقية',
};

// Each reason states what actually led to the choice, so items don't repeat the same generic line.
export function whyChosen(s: AppState, id: ChallengeId, index = 0, named = new Set<string>()): string {
  const r: string[] = [];
  const last = lastAccuracy(s, id);
  if (id === 'calm' && isLowEnergy(s)) r.push('قلت لي طاقتك قليلة، فخلينا آخرها تهدئة');
  else if (index === 0 && isLowEnergy(s)) r.push(s.pref === 'short' ? 'وافقت نخفف مهمة اليوم، فأخذنا النسخة الأسهل' : 'قلت لي طاقتك قليلة، فأخذنا النسخة الأسهل');
  if (s.ctx.includes('event') && id === 'seq') r.push('سجلت إن عندك مناسبة، فنمرّن ترتيب التجهيز');
  if (last != null && last < 60) r.push('آخر دقة لك ' + last + '%، فنبدأها أسهل');
  if (r.length) return r.join('، ');
  // A journey is named once in a mission, so the steps don't all repeat the same line.
  const journey = JOURNEYS.find((j) => s.needs.includes(j.id) && j.id !== 'gen' && j.a.includes(id) && !named.has(j.id));
  if (journey) {
    named.add(journey.id);
    return 'من رحلتك: ' + journey.n;
  }
  return DEFAULT_WHY[id] ?? 'مهمة بداية عامة';
}

// The mission-level line, built only from what the user told us.
export function missionReason(s: AppState): string {
  const low = isLowEnergy(s);
  const parts: string[] = [];
  if (low) parts.push('على قد طاقتك اليوم');
  if (s.ctx.includes('event')) parts.push('مع مناسبتك اللي سجلتها');
  if (s.ctx.includes('sleep') && !low) parts.push('مع مراعاة نومك اللي ذكرته');
  if (parts.length) return 'خطوات بسيطة، ' + parts.join('، ') + '.';
  return s.hist.length ? 'ثلاث خطوات بسيطة، وننتقل بينها تلقائيًا.' : 'مهمة بداية عامة، لين نعرف يومك أكثر. سولف معي وأخففها لك.';
}

// Rule-based planner, not AI inference. An AI planner can propose later, and these rules stay as the validator.
export function generateMission(s: AppState): PlannedItem[] {
  const event = s.ctx.includes('event');
  const ids: ChallengeId[] = [
    'video',
    event ? 'seq' : 'mem',
    isLowEnergy(s) ? 'calm' : s.needs.some((n) => n === 'adhd' || n === 'mood') ? 'start2' : 'time',
  ];
  const named = new Set<string>();
  return ids.map((id, i) => {
    const last = lastAccuracy(s, id);
    return {
      id,
      why: whyChosen(s, id, i, named),
      diff: (last != null && last < 60) || (isLowEnergy(s) && id !== 'calm') ? 'easy' : 'normal',
    };
  });
}
