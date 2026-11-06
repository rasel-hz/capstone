import { describe, expect, it } from 'vitest';
import { detectCrisis } from '../src/features/companion/crisis';
import { ruleReply } from '../src/features/companion/rules';
import { defaultState } from '../src/services/storage';

describe('crisis detection', () => {
  it.each([
    ['ابي اموت', 1], ['أبي أموووت', 1], ['ودّي أنتحر', 1], ['تعبت من الحياة', 1], ['ما عاد أبي أعيش', 1], ['I want to die', 1], ['أذي نفسي', 1],
    ['حاس اني بموت', 2], ['ما عاد فيني', 2], ['بموت من التعب', 2],
    ['اموت فيك', 0], ['بموت من الضحك', 0], ['ابي اموت من الضحك', 0], ['اموت من الجوع', 0], ['تعبان اليوم', 0], ['عندي عزيمة', 0], ['هلا', 0],
  ])('%s -> %i', (text, level) => {
    expect(detectCrisis(text)).toBe(level);
  });
});

describe('rule replies', () => {
  it('asks before saving context', () => {
    const r = ruleReply('نمت متأخر وعندي عزيمة', defaultState());
    expect(r.pending?.ctx).toEqual(['sleep', 'event']);
  });

  it('never suggests a game in a crisis reply', () => {
    const r = ruleReply('ابي اموت', defaultState());
    expect(r.tone).toBe('crisis');
    expect(r.pending).toBeUndefined();
    expect(r.messages[0]).toContain('997');
    expect(r.messages[0]).not.toContain('مهمة');
  });

  it('reports only real results', () => {
    expect(ruleReply('كيف تقدمي', defaultState()).messages[0]).toContain('ما عندي سجل');
  });
});
