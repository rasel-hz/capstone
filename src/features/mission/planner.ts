import { formatList, tr } from '../../i18n';
import type { AppState, ChallengeId, PlannedItem, Why, WhyPart } from '../../types';
import { today } from '../../utils';
import { JOURNEYS } from '../challenges/catalog';
import { todayGoals } from '../buddy/buddy';
import { currentWindow } from '../prayer/gate';

export function isLowEnergy(s: AppState): boolean {
  const e = s.en[s.en.length - 1];
  return !!(e && e.d === today() && e.e === 'low') || s.pref === 'short';
}

/** Inside a protected prayer window. This only informs a check-in now; it never blocks on its own. */
export function inPrayerWindow(s: AppState, now = new Date()): boolean {
  return !!currentWindow(s, now);
}

export function lastAccuracy(s: AppState, id: ChallengeId): number | null {
  const a = s.hist.filter((h) => h.id === id && h.acc != null);
  return a.length ? a[a.length - 1].acc : null;
}

// Reasons are saved as codes and written out when shown, so they follow the selected language.
const DEFAULT_WHY: Partial<Record<ChallengeId, string>> = { video: 'video', mem: 'mem', micro_start: 'start2', attention_scene: 'scene', seq: 'seq' };

// Each reason states what actually led to the choice, so items don't repeat the same generic line.
export function whyChosen(s: AppState, id: ChallengeId, index = 0, named = new Set<string>()): WhyPart[] {
  const r: WhyPart[] = [];
  const last = lastAccuracy(s, id);
  if (id === 'calm' && isLowEnergy(s)) r.push({ k: 'lowCalm' });
  else if (index === 0 && isLowEnergy(s)) r.push({ k: s.pref === 'short' ? 'shortFirst' : 'lowFirst' });
  if (s.ctx.includes('event') && id === 'seq') r.push({ k: 'eventSeq' });
  if (last != null && last < 60) r.push({ k: 'lastLow', acc: last });
  if (r.length) return r;
  // A journey is named once in a mission, so the steps don't all repeat the same line.
  const journey = JOURNEYS.find((j) => s.needs.includes(j.id) && j.id !== 'gen' && j.a.includes(id) && !named.has(j.id));
  if (journey) {
    named.add(journey.id);
    return [{ k: 'journey', journey: journey.id }];
  }
  return [{ k: DEFAULT_WHY[id] ?? 'starter' }];
}

export function whyText(why: Why): string {
  if (typeof why === 'string') return why;
  return formatList(why.map((p) => tr(`planner.why.${p.k}`, { acc: p.acc, n: p.n, count: p.n, journey: p.journey ? tr(`journeys.items.${p.journey}.name`) : '' })));
}

// The mission-level line, built only from what the user told us.
export function missionReason(s: AppState): string {
  const low = isLowEnergy(s);
  const parts: string[] = [];
  if (low) parts.push(tr('planner.reason.low'));
  if (s.ctx.includes('event')) parts.push(tr('planner.reason.event'));
  if (s.ctx.includes('sleep') && !low) parts.push(tr('planner.reason.sleep'));
  if (parts.length) return tr('planner.reason.withContext', { parts: formatList(parts) });
  return tr(s.hist.length ? 'planner.reason.steps' : 'planner.reason.starter');
}

// Rule-based planner, not AI inference. An AI planner can propose later, and these rules stay as the validator.
export function generateMission(s: AppState): PlannedItem[] {
  // Arranging the day only works on the user's own tasks, so it comes in only when today has at least two open goals.
  const open = todayGoals(s).filter((g) => !g.done).length;
  const ids: ChallengeId[] = [
    'video',
    open >= 2 ? 'seq' : 'mem',
    isLowEnergy(s) ? 'calm' : s.needs.some((n) => n === 'adhd' || n === 'mood') ? 'micro_start' : 'attention_scene',
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
