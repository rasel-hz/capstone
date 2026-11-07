import type { AppState } from '../../types';
import { CHALLENGES } from '../challenges/catalog';
import { isLowEnergy } from '../mission/planner';
import { isCrisisText } from './crisis';
import { progressStats } from '../progress/stats';
import { helpfulness } from '../recommend/engine';
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
