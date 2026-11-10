import { describe, expect, it } from 'vitest';
import { fillName } from '../src/features/companion/name';
import { acceptOutput } from '../server/chat';

const reply = (text: string) => JSON.stringify({ reply: text, reply_language: 'ar', intent: 'chat', tone: 'friendly', distress: false, goals: [], tasks: [], available_minutes: null, suggest: { challenge_ids: [], reason: '' }, context: { event: false, work: false, sleep: false, low_energy: false } });

describe('addressing the user by name', () => {
  it('fills the name on the device', () => {
    expect(fillName('يا {name}، هلا', 'Razan')).toContain('Razan');
    expect(fillName('Nice one, {name}!', 'Razan')).toContain('Razan');
  });

  it('drops the address cleanly when no name is saved', () => {
    expect(fillName('يا {name}، شكله يومك مليان', '')).toBe('شكله يومك مليان');
    expect(fillName('Nice one, {name}!', '')).not.toContain('{name}');
  });

  it('leaves text without the token alone', () => {
    expect(fillName('hello', 'Razan')).toBe('hello');
  });

  it('turns the old pet phrase into the name token on the server', () => {
    const out = acceptOutput(reply('يا بعدي، ارتاح شوي'));
    expect(out.reply).not.toContain('بعدي');
    expect(out.reply).toContain('{name}');
  });
});
