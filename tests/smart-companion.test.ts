import { describe, expect, it } from 'vitest';
import { acceptOutput } from '../server/chat';
import { REPLY_SCHEMA } from '../server/prompt';
import { CHALLENGES } from '../src/features/challenges/catalog';
import { messageLang } from '../src/features/companion/lang';
import { detectGoals, ruleReply, statedMinutes } from '../src/features/companion/rules';
import { buildSuggestion } from '../src/features/recommend/suggest';
import { setLanguage } from '../src/i18n';
import { defaultState } from '../src/services/storage';
import { today } from '../src/utils';

// The message from the brief that the old chat answered with a generic "save work/study?" card.
const BRIEF = "I had a long day at work, what I did from 9 am to 5 pm. When I come back home I want to continue on my personal projects. One is a Udacity course that is a lot advanced and that I am still paying for. Next is learning about quantitative trading. And I have a lot of other interests like playing chess. I am having difficulty to organize these times appropriately. What do you think?";

const model = (o: object) => JSON.stringify({
  reply: 'Pick one main project for tonight.', reply_language: 'en', intent: 'planning', tone: 'friendly', distress: false,
  goals: ['prioritize'], available_minutes: null, suggest: { challenge_ids: [], reason: '' },
  context: { event: false, work: false, sleep: false, low_energy: false }, ...o,
});

describe('model output checks', () => {
  it('keeps only real catalog IDs, without repeats, and at most three', () => {
    const r = acceptOutput(model({ suggest: { challenge_ids: ['seq', 'made_up', 'seq', 'priority_board', 'breakdown', 'start2', 'micro_start', 'calm'], reason: 'Because you mentioned several projects.' } }), 'en');
    // Retired challenges are dropped like unknown ones.
    expect(r.suggest).toEqual({ ids: ['seq', 'breakdown', 'micro_start'], why: 'Because you mentioned several projects.' });
  });

  it('suggests nothing when the model suggests nothing', () => {
    expect(acceptOutput(model({}), 'en').suggest).toBeUndefined();
  });

  it('drops unknown goals and intents instead of trusting them', () => {
    const r = acceptOutput(model({ goals: ['prioritize', 'adhd'], intent: 'diagnose' }), 'en');
    expect(r.goals).toEqual(['prioritize']);
    expect(r.intent).toBe('other');
  });

  it('never suggests an activity alongside a crisis response', () => {
    const r = acceptOutput(model({ distress: true, suggest: { challenge_ids: ['calm'], reason: 'x' } }), 'en');
    expect(r.tone).toBe('crisis');
    expect(r.suggest).toBeUndefined();
  });

  it('never shows a save card when the person asked for advice or a plan', () => {
    const flags = { context: { event: false, work: true, sleep: false, low_energy: true } };
    expect(acceptOutput(model({ ...flags, intent: 'planning' }), 'en').pending).toBeUndefined();
    expect(acceptOutput(model({ ...flags, intent: 'advice' }), 'en').pending).toBeUndefined();
    expect(acceptOutput(model({ ...flags, intent: 'support' }), 'en').pending).toEqual({ ctx: ['work'], low: true });
  });

  it('accepts only sensible stated minutes', () => {
    expect(acceptOutput(model({ available_minutes: 20 }), 'en').minutes).toBe(20);
    expect(acceptOutput(model({ available_minutes: -5 }), 'en').minutes).toBeUndefined();
  });

  it('limits the schema to catalog IDs, so the model cannot name anything else', () => {
    expect(REPLY_SCHEMA.properties.suggest.properties.challenge_ids.items.enum).toEqual(Object.keys(CHALLENGES).filter((id) => !CHALLENGES[id as keyof typeof CHALLENGES].retired));
  });
});

describe('language follows the message', () => {
  it.each([
    ['How do I organise my evening?', 'ar-SA', 'en'],
    ['وش أسوي الليلة؟', 'en', 'ar-SA'],
    ['عندي exam بكرة وما ذاكرت', 'en', 'ar-SA'],
    ['20', 'en', 'en'],
    ['20', 'ar-SA', 'ar-SA'],
  ])('%s with the app in %s -> %s', (text, app, expected) => {
    expect(messageLang(text, app as 'ar-SA' | 'en')).toBe(expected);
  });
});

describe('offline replies, labelled as limited', () => {
  it('sees that the brief message is about organising time, not just "work"', () => {
    expect(detectGoals(BRIEF)[0]).toBe('prioritize');
  });

  it('answers in English with real advice and an optional activity, and asks to save nothing', () => {
    setLanguage('ar-SA');
    const r = ruleReply(BRIEF, defaultState());
    expect(/[؀-ۿ]/.test(r.messages[0])).toBe(false);
    expect(r.messages[0]).toMatch(/one thing that matters most/);
    expect(r.pending).toBeUndefined();
    expect(r.proposal?.goals?.[0]).toBe('prioritize');
  });

  it('answers Saudi Arabic in Arabic', () => {
    setLanguage('en');
    const r = ruleReply('عندي أشياء كثير وما أدري من وين أبدأ', defaultState());
    expect(/[؀-ۿ]/.test(r.messages[0])).toBe(true);
    expect(r.proposal?.goals).toContain('prioritize');
    setLanguage('ar-SA');
  });

  it('respects wanting to rest', () => {
    expect(detectGoals("I'm exhausted and don't feel like doing anything")[0]).toBe('rest');
  });

  it('reads the time the user has', () => {
    expect(statedMinutes('I only have 20 minutes tonight')).toBe(20);
    expect(statedMinutes('عندي 10 دقايق')).toBe(10);
    expect(statedMinutes('no time given')).toBeUndefined();
  });

  it('still asks before saving when the user describes today', () => {
    expect(ruleReply('سهرت أمس وعندي دوام', defaultState()).pending).toBeDefined();
  });
});

describe('suggestion card', () => {
  it('offers the personal planning board, then breaking it down, for an organising request', () => {
    const sug = buildSuggestion(defaultState(), { goals: ['prioritize'] });
    expect(sug?.ids.slice(0, 2)).toEqual(['seq', 'breakdown']);
    expect(sug?.cfg?.kind).toBe('personal');
  });

  it('puts the AI pick first, with its written reason', () => {
    const sug = buildSuggestion(defaultState(), { prefer: ['breakdown'], goals: ['prioritize'], why: 'Because you mentioned three projects.' });
    expect(sug?.ids[0]).toBe('breakdown');
    expect(sug?.why).toBe('Because you mentioned three projects.');
  });

  it('drops an AI pick that does not fit the time the user has', () => {
    const sug = buildSuggestion(defaultState(), { prefer: ['study_sprint'], goals: ['focus'], minutes: 2 });
    expect(sug?.ids).not.toContain('study_sprint');
  });

  it('offers only gentle options on a low-energy day', () => {
    const s = { ...defaultState(), en: [{ d: today(), e: 'low' as const, ts: 1 }] };
    const sug = buildSuggestion(s, { goals: ['start'] });
    expect(sug?.ids.sort()).toEqual(['micro_start']);
  });

  it('shows nothing while driving', () => {
    expect(buildSuggestion({ ...defaultState(), driving: 1 }, { goals: ['prioritize'] })).toBeUndefined();
  });
});
