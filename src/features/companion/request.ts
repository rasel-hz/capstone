import type { AppState } from '../../types';
import { CHALLENGES } from '../challenges/catalog';
import { dhikrNow } from '../dhikr/content';
import { isLowEnergy } from '../mission/planner';
import { isCrisisText } from './crisis';
import { progressStats } from '../progress/stats';
import { helpfulness, lastFeedback } from '../recommend/engine';
import { currentNode } from '../path/planner';
import { localDate } from '../prayer/times';
import { streakTz } from '../streak/streak';
import { lastPlan } from '../plan/history';
import { currentWindow, nextOf } from '../prayer/gate';

function journeyContext(s: AppState, now = Date.now()) {
  const plan = s.path;
  const cur = currentNode(plan);
  if (!plan || !cur) return null;
  return {
    theme: plan.themes[cur.ch] ?? 'gentle',
    upcoming: plan.nodes.filter((n) => !n.done && n.kind === 'play' && n.id).slice(0, 6).map((n) => n.id),
    done: plan.nodes.filter((n) => n.done && n.kind === 'play').length,
    adapted: plan.adapted ? { goal: plan.adapted.goal, hours_ago: Math.round((now - plan.adapted.at) / 3600e3) } : null,
  };
}

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
      feedback: [...new Set((s.fb ?? []).map((f) => f.id))].map((id) => ({ id, net: helpfulness(s, id), last: lastFeedback(s, id)?.v ?? null })),
      // The journey as challenge IDs only: its theme now, the next steps, and the last change made from the chat.
      journey: journeyContext(s),
      // What the user finished lately, by their local day. Self-report check-ins stay on the device.
      recent: [...s.hist].reverse().filter((h) => h.status === 'COMPLETED' && CHALLENGES[h.id] && !CHALLENGES[h.id].selfReport).slice(0, 5)
        .map((h) => ({ id: h.id, day: localDate(new Date(h.ts), streakTz(s)) })),
      // Tasks the user already shared in this chat, and what they chose for them, so follow-ups are factual.
      lastPlan: lastPlan(s),
      // Only for scheduling: the next prayer and how far away it is. Never the location or any check-in answer.
      prayer: prayerContext(s),
      // What the user chose to tell us in onboarding, for advice that fits.
      about: s.prof,
      // Only which dhikr challenges fit the time now, from the device clock. Nothing about the user.
      dhikrNow: dhikrNow(),
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
