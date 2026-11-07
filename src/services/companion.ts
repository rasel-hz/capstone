import { detectCrisis } from '../features/companion/crisis';
import { buildChatRequest } from '../features/companion/request';
import { mentionsWork, ruleReply, type CompanionReply } from '../features/companion/rules';
import type { Goal } from '../features/recommend/goals';
import type { AppState, ContextTag } from '../types';
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
    };
    // Only a request for help planning gets the board on its own; recalling a past plan doesn't.
    const planning = (r.intent === 'planning' || r.intent === 'advice') && !!r.tasks?.length && !!r.goals?.some((g) => g === 'prioritize' || g === 'time');
    return {
      messages: [r.reply],
      tone: r.tone,
      ...(r.pending ? { pending: { ctx: r.pending.ctx, low: r.pending.low ? 1 : 0, card: 1 } } : {}),
      // Only shown as a card when the model actually suggested something.
      // Named tasks plus a wish to organise them is enough to offer the personal planning board.
      ...((r.suggest || planning) && r.tone !== 'crisis'
        ? { proposal: { prefer: r.suggest?.ids ?? [], goals: r.goals, minutes: r.minutes, why: r.suggest?.why, tasks: r.tasks, afterWork: mentionsWork(text) } }
        : {}),
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
