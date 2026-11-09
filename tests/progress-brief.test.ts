import { describe, expect, it } from 'vitest';
import { acceptBrief, handleBrief, parseBrief } from '../server/brief';
import { briefInput, fallbackBrief } from '../src/features/progress/brief';
import { defaultState } from '../src/services/storage';

describe('progress brief request', () => {
  it('keeps only sane numbers and drops crisis lines before the AI sees them', () => {
    const r = parseBrief({ lang: 'fr', gender: 'x', stats: { week: -3, streak: 1e9, names: ['a', 5], journeys: [{ name: 'Focus', before: 9, after: 2 }] }, notes: ['study for exams', 'I want to die', 'tired today'] });
    expect(r.lang).toBe('ar-SA');
    expect(r.gender).toBe('m');
    expect(r.stats.week).toBe(0);
    expect(r.stats.streak).toBe(10000);
    expect(r.stats.names).toEqual(['a']);
    expect(r.stats.journeys[0]).toEqual({ name: 'Focus', before: 5, after: 2 });
    expect(r.notes).toEqual(['study for exams', 'tired today']);
  });

  it('turns the old pet phrase into the name token and refuses diagnosis', () => {
    expect(acceptBrief(JSON.stringify({ headline: 'يا بعدي، كفو', nudge: '' })).headline).toContain('{name}');
    expect(() => acceptBrief(JSON.stringify({ headline: 'You have ADHD.', nudge: '' }))).toThrow();
    expect(() => acceptBrief(JSON.stringify({ headline: 'x'.repeat(200), nudge: '' }))).toThrow();
    expect(() => acceptBrief('not json')).toThrow();
  });

  it('needs an API key', async () => {
    await expect(handleBrief({}, {})).rejects.toThrow();
  });

  it('sends only the model output text back', async () => {
    const fake = async () => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ headline: 'Nice week, {name}.', nudge: 'One more today?' }) }] }] }));
    const out = await handleBrief({ lang: 'en', stats: { week: 3 } }, { apiKey: 'k', fetch: fake as typeof fetch });
    expect(out).toEqual({ headline: 'Nice week, {name}.', nudge: 'One more today?' });
  });
});

describe('progress brief freshness', () => {
  it('passes today\'s facts and the last headline through, cleaned', () => {
    const r = parseBrief({ stats: { today: ['Take It Easy', 3], rest: 'yes', gap: 4.6 }, previous: '  last   one  ' });
    expect(r.stats.today).toEqual(['Take It Easy']);
    expect(r.stats.rest).toBe(false);
    expect(r.stats.gap).toBe(5);
    expect(r.previous).toBe('last one');
    expect(parseBrief({}).stats.gap).toBeNull();
  });

  it('sends only chat lines from the last two days, and the last headline', () => {
    const now = Date.now();
    const s = defaultState();
    s.chat = [{ t: 'no time' }, { t: 'last week', at: now - 8 * 864e5 }, { t: 'this morning', at: now - 3600e3 }];
    s.brief = { d: 'x', lang: 'ar-SA', text: 'old headline', nudge: 'old nudge' };
    const input = briefInput(s, now);
    expect(input.notes).toEqual(['this morning']);
    expect(input.previous).toBe('old headline | old nudge');
  });
});

describe('progress brief input on the device', () => {
  it('sends counts and the user\'s own recent lines, never the companion\'s or the name', () => {
    const s = defaultState();
    s.name = 'Secret Name';
    s.hist.push({ mid: 'm', id: 'calm', status: 'COMPLETED', acc: null, retries: 0, xp: 15, dur: 60, d: new Date().toDateString(), ts: Date.now() });
    s.chat = [{ t: 'hello from me', at: Date.now() }, { b: 1, t: 'reply from zaho' }];
    const input = briefInput(s);
    expect(input.stats.week).toBe(1);
    expect(input.stats.activeDays).toBe(1);
    expect(input.notes).toEqual(['hello from me']);
    expect(JSON.stringify(input)).not.toContain('Secret Name');
  });

  it('falls back to a plain summary without the AI', () => {
    const s = defaultState();
    expect(fallbackBrief(briefInput(s)).headline).toBeTruthy();
  });
});
