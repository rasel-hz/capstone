import type { AppState, ChallengeId, PlannedItem } from '../../types';
import { today } from '../../utils';

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

export function whyChosen(s: AppState, id: ChallengeId): string {
  const r: string[] = [];
  const last = lastAccuracy(s, id);
  if (isLowEnergy(s)) r.push('ذكرت إن طاقتك قليلة، فاخترت لك الأخف');
  if (s.pref === 'short') r.push('وافقت نعتمد التحديات القصيرة');
  if (s.ctx.includes('event') && id === 'seq') r.push('عندك مناسبة الليلة، فنجهّزها بالترتيب');
  if (last != null && last < 60) r.push('آخر مرة كانت نتيجتك ' + last + '%، فنبدأها أسهل');
  if (id === 'video') r.push('نبدأ بتركيز قصير');
  return r.length ? r.join('، ') : 'يناسب الرحلات اللي اخترتها';
}

// Rule-based planner, not AI inference. An AI planner can propose later, and these rules stay as the validator.
export function generateMission(s: AppState): PlannedItem[] {
  const event = s.ctx.includes('event');
  const ids: ChallengeId[] = [
    'video',
    event ? 'seq' : 'mem',
    isLowEnergy(s) ? 'calm' : s.needs.some((n) => n === 'adhd' || n === 'mood') ? 'start2' : 'time',
  ];
  return ids.map((id) => {
    const last = lastAccuracy(s, id);
    return {
      id,
      why: whyChosen(s, id),
      diff: (last != null && last < 60) || (isLowEnergy(s) && id !== 'calm') ? 'easy' : 'normal',
    };
  });
}
