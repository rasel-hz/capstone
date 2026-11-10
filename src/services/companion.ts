import { dhikrFitsNow, isDhikr } from '../features/dhikr/content';
import { pickDhikr } from '../features/dhikr/pick';
import { detectCrisis } from '../features/companion/crisis';
import { buildChatRequest } from '../features/companion/request';
import { mentionsWork, ruleReply, type CompanionReply } from '../features/companion/rules';
import type { Goal } from '../features/recommend/goals';
import type { AppState, ChallengeId, ContextTag } from '../types';
import { apiUrl } from './native';

export interface CompanionService {
  readonly isAI: boolean;
  respond(text: string, state: AppState): Promise<CompanionReply>;
}

export const ruleCompanion: CompanionService = {
  isAI: false,
  respond: async (text, state) => ruleReply(text, state),
};

export const aiCompanion: CompanionService = {
  isAI: true,
  async respond(text, state) {
    // Clear crisis wording is answered on the device and never sent anywhere.
    if (detectCrisis(text)) return ruleReply(text, state);
    const res = await fetch(apiUrl('/v1/chat/messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildChatRequest(text, state)),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`chat failed: ${res.status}`);
    const r = (await res.json()) as {
      reply: string;
      tone: CompanionReply['tone'];
      pending?: { ctx: ContextTag[]; low: boolean };
      intent?: string;
      goals?: Goal[];
      tasks?: string[];
      minutes?: number;
      suggest?: { ids: string[]; why: string };
      journey?: { action: 'single' | 'adjust'; focus?: Goal; named?: boolean; dhikr?: boolean };
    };
    // One challenge asked for: one card. A named one is honoured even outside its usual time.
    const single = r.journey?.action === 'single';
    const named = single && r.journey?.named ? (r.suggest?.ids ?? []).slice(0, 1) : [];
    // A dhikr asked for in general follows the user's local time, not the model's guess: morning in the
    // morning, evening in the evening, bedtime at night. A fitting one the model chose, or "calm your heart"
    // for worry, is kept; a dhikr the user named is never replaced.
    if (single && !named.length && r.suggest?.ids[0] && isDhikr(r.suggest.ids[0])) {
      const id = r.suggest.ids[0];
      const keep = id === 'dhikr_calm_heart' || (id !== 'dhikr_moment' && dhikrFitsNow(id as ChallengeId));
      if (!keep) r.suggest.ids = [pickDhikr()];
    }
    // Only a request for help planning gets the board on its own; recalling a past plan doesn't.
    const planning = (r.intent === 'planning' || r.intent === 'advice') && !!r.tasks?.length && !!r.goals?.some((g) => g === 'prioritize' || g === 'time');
    return {
      messages: [r.reply],
      tone: r.tone,
      ...(r.pending ? { pending: { ctx: r.pending.ctx, low: r.pending.low ? 1 : 0, card: 1 } } : {}),
      // Only shown as a card when the model actually suggested something.
      // Named tasks plus a wish to organise them is enough to offer the personal planning board.
      ...((r.suggest || planning) && r.tone !== 'crisis'
        ? { proposal: { prefer: r.suggest?.ids ?? [], goals: r.goals, minutes: r.minutes, why: r.suggest?.why, tasks: r.tasks, afterWork: mentionsWork(text), ...(single ? { single: true, explicit: named as ChallengeId[] } : {}) } }
        : {}),
      ...(r.journey?.action === 'adjust' && r.journey.focus && r.tone !== 'crisis' ? { journey: { focus: r.journey.focus, dhikr: !!r.journey.dhikr } } : {}),
    };
  },
};

// True only when the server confirms a key is configured, so the app never claims AI that isn't connected.
export async function isAiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/v1/health'), { signal: AbortSignal.timeout(5000) });
    return res.ok && ((await res.json()) as { ai?: boolean }).ai === true;
  } catch {
    return false;
  }
}
