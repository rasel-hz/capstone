import type { AppState } from '../../types';
import { CHALLENGES } from '../challenges/catalog';
import { isLowEnergy } from '../mission/planner';
import { isCrisisText } from './crisis';
import { progressStats } from '../progress/stats';
import { helpfulness } from '../recommend/engine';
import { lastPlan } from '../plan/history';
import { currentWindow, nextOf } from '../prayer/gate';

function prayerContext(s: AppState, now = new Date()) {
  const n = nextOf(s, now);
  if (!n) return null;
  return { next: n.id, minutesUntil: Math.max(0, Math.round((n.at.getTime() - now.getTime()) / 60000)), inWindow: !!currentWindow(s, now) };
}
import { today } from '../../utils';

// Only what the reply needs leaves the device. The name, chosen journeys and task text are never sent.
export function buildChatRequest(message: string, s: AppState) {
  const st = progressStats(s);
  return {
    message,
    history: s.chat
      .filter((m) => !m.card && !m.sug && m.t && !isCrisisText(m.t))
      .slice(-8)
      .map((m) => ({ role: m.b ? 'assistant' : 'user', text: m.t })),
    context: {
      address: s.g,
      lang: s.lang,
      lowEnergyToday: isLowEnergy(s),
      energy: s.en.length && s.en[s.en.length - 1].d === today() ? s.en[s.en.length - 1].e : null,
      confirmed: s.ctx,
      // Only the net answer per activity, never when or how often it was given.
      feedback: [...new Set((s.fb ?? []).map((f) => f.id))].map((id) => ({ id, net: helpfulness(s, id) })),
      // Tasks the user already shared in this chat, and what they chose for them, so follow-ups are factual.
      lastPlan: lastPlan(s),
      // Only for scheduling: the next prayer and how far away it is. Never the location or any check-in answer.
      prayer: prayerContext(s),
      // What the user chose to tell us in onboarding, for advice that fits. Sent only with chat consent.
      about: s.prof,
      attempts: st.attempts.length,
      completed: st.completed.length,
      avgAccuracy: st.avgAccuracy,
      // Self-reported feelings stay on the device, even as a count.
      byChallenge: st.byChallenge.filter(([id]) => !CHALLENGES[id].selfReport).map(([id, a]) => {
        const scored = a.filter((h) => h.acc != null);
        return { id, count: a.length, lastAccuracy: scored.length ? scored[scored.length - 1].acc : null };
      }),
    },
  };
}
