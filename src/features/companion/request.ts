import type { AppState } from '../../types';
import { isLowEnergy } from '../mission/planner';
import { isCrisisText } from './crisis';
import { progressStats } from '../progress/stats';

// Only what the reply needs leaves the device. The name, chosen journeys and task text are never sent.
export function buildChatRequest(message: string, s: AppState) {
  const st = progressStats(s);
  return {
    message,
    history: s.chat
      .filter((m) => !m.card && !isCrisisText(m.t))
      .slice(-8)
      .map((m) => ({ role: m.b ? 'assistant' : 'user', text: m.t })),
    context: {
      address: s.g,
      lowEnergyToday: isLowEnergy(s),
      confirmed: s.ctx,
      attempts: st.attempts.length,
      completed: st.completed.length,
      avgAccuracy: st.avgAccuracy,
      byChallenge: st.byChallenge.map(([id, a]) => {
        const scored = a.filter((h) => h.acc != null);
        return { id, count: a.length, lastAccuracy: scored.length ? scored[scored.length - 1].acc : null };
      }),
    },
  };
}
