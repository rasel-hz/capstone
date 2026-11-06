import { ruleReply, type CompanionReply } from '../features/companion/rules';
import type { AppState } from '../types';

// The chat talks to this interface. A real AI backend can implement it without changing the page.
export interface CompanionService {
  readonly isAI: boolean;
  respond(text: string, state: AppState): Promise<CompanionReply>;
}

export const ruleCompanion: CompanionService = {
  isAI: false,
  respond: async (text, state) => ruleReply(text, state),
};
