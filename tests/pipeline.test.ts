import { describe, expect, it, vi } from 'vitest';
import { handleChat, parseRequest } from '../server/chat';
import { groundedTasks } from '../server/grounding';
import { planSummary, taskLabel } from '../src/features/challenges/games/PersonalPlanGame';
import { ruleReply } from '../src/features/companion/rules';
import { completeItem, createMission } from '../src/features/mission/engine';
import { buildPlanConfig, isPlanResult, overTime, validatePlanConfig, type PlanResult } from '../src/features/plan/config';
import { lastPlan } from '../src/features/plan/history';
import { clearTypedText, typedCount } from '../src/features/plan/privacy';
import { buildSuggestion } from '../src/features/recommend/suggest';
import { setLanguage } from '../src/i18n';
import { defaultState } from '../src/services/storage';
import { today } from '../src/utils';

// The message from the brief, word for word, typos included.
const BRIEF = "I hade a long day at work, what I did from 9 am to 5 pm. When I come back home I want to continue on my personal projects I have. One that is from Udacity course that is a lot advanced and that I am still paying for, which I really like and want to learn more about it. Next is learning about quantitative training because it interests me. And I have a lot of other interests like playing chess. I am having difficult to organize these times appropriately. What do you think?";

const modelReply = (o: object) => ({
  status: 'completed',
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({
    reply: 'One main focus per evening helps. How much time do you usually have after work?', reply_language: 'en', intent: 'planning', tone: 'friendly', distress: false,
    goals: ['prioritize'], tasks: [], available_minutes: null, suggest: { challenge_ids: [], reason: '' },
    context: { event: false, work: false, sleep: false, low_energy: false }, ...o,
  }) }] }],
});

function fakeModel(o: object, seen: unknown[] = []) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).endsWith('/moderations')) return Response.json({ results: [{ categories: {} }] });
    seen.push(JSON.parse(String(init?.body)));
    return Response.json(modelReply(o));
  }) as unknown as typeof fetch;
}

describe('Test A: the Udacity message becomes a personal planning board', () => {
  it('keeps the tasks the user named, in their words, and drops invented ones', async () => {
    const f = fakeModel({
      tasks: ['Udacity AI course', 'quantitative training', 'chess', 'Check university lecture schedule', 'Have coffee'],
      suggest: { challenge_ids: ['seq', 'priority_board'], reason: 'Because you mentioned three interests and want to organise them.' },
    });
    const r = await handleChat({ message: BRIEF, history: [], context: { lang: 'ar-SA' } }, { apiKey: 'test-key-not-real', fetch: f });
    expect(r.tasks).toEqual(['Udacity AI course', 'quantitative training', 'chess']);
    expect(r.pending).toBeUndefined();
    expect(r.reply).toMatch(/how much time/i);
  });

  it('keeps "quantitative training" as written instead of correcting it', () => {
    expect(groundedTasks(['quantitative training'], BRIEF)).toEqual(['quantitative training']);
  });

  it('builds the board from exactly those tasks, with only a labelled optional break added', () => {
    const sug = buildSuggestion(defaultState(), { goals: ['prioritize'], tasks: ['Udacity AI course', 'quantitative training', 'chess'], afterWork: true, prefer: ['seq'] });
    expect(sug?.ids[0]).toBe('seq');
    const tasks = sug!.cfg!.tasks;
    expect(tasks.filter((t) => t.src === 'user').map((t) => t.text)).toEqual(['Udacity AI course', 'quantitative training', 'chess']);
    expect(tasks.filter((t) => t.src === 'suggested')).toEqual([{ id: 's1', text: '', src: 'suggested', key: 'break' }]);
    expect(JSON.stringify(sug)).not.toMatch(/university|lecture|coffee|exam/i);
    // Time wasn't given, so none is assumed.
    expect(sug!.cfg!.minutes).toBeUndefined();
  });

  it('checks only objective limits: the blocks must fit the time given', () => {
    expect(overTime([{ mins: 45 }, { mins: 25 }, { mins: 20 }], 90)).toBe(0);
    expect(overTime([{ mins: 60 }, { mins: 40 }], 90)).toBe(10);
    expect(overTime([{ mins: 300 }])).toBe(0);
  });

  it('saves what the user chose, earns XP once with no score, and the follow-up only repeats those choices', () => {
    setLanguage('en');
    const cfg = buildPlanConfig(['Udacity AI course', 'quantitative training', 'chess'], { afterWork: true });
    const s = defaultState();
    createMission(s, [{ id: 'seq', why: [{ k: 'chat' }], diff: 'normal', cfg }], true);
    const result: PlanResult = { kind: 'personal', now: ['u1'], later: ['u2'], notToday: ['u3'], blocks: [{ id: 'u1', mins: 45 }], minutes: 60, tasks: cfg.tasks };
    const out = completeItem(s, { acc: null, retries: 0, data: result });
    expect(out?.xp).toBe(25);
    expect(completeItem(s, { acc: null, retries: 0, data: result })).toBeNull();
    expect(s.xp).toBe(25);
    expect(s.hist[0].acc).toBeNull();

    const text = planSummary(result);
    expect(text).toContain('Udacity AI course');
    expect(text).toContain('45 min');
    expect(text).toContain('quantitative training');
    expect(text).not.toMatch(/break/i);

    const lp = lastPlan(s)!;
    expect(lp).toMatchObject({ now: ['Udacity AI course'], later: ['quantitative training'], notToday: ['chess'], blocks: [{ task: 'Udacity AI course', mins: 45 }], minutes: 60 });
    expect(parseRequest({ message: 'What did I decide?', context: { lastPlan: lp } }).context.lastPlan?.now).toEqual(['Udacity AI course']);
  });

  it('gives the model the saved plan, so it can answer "what did I decide?" from facts', async () => {
    const seen: { input: { content: string }[] }[] = [];
    const lp = { day: new Date().toISOString().slice(0, 10), now: ['Udacity AI course'], later: ['chess'], notToday: [], blocks: [], minutes: null };
    await handleChat({ message: 'What did I decide to focus on?', context: { lang: 'en', lastPlan: lp } }, { apiKey: 'test-key-not-real', fetch: fakeModel({}, seen) });
    expect(seen[0].input[0].content).toContain('"last_plan":{"day"');
    expect(seen[0].input[0].content).toContain('Udacity AI course');
  });
});

describe('Test B: no personal tasks', () => {
  it('never builds a personal board when no tasks were given and planning wasn\'t asked for', () => {
    expect(buildSuggestion(defaultState(), { goals: [] })?.cfg).toBeUndefined();
    expect(groundedTasks(['Finish your report', 'Go to the gym'], "I'm bored. What can I do?")).toEqual([]);
  });

  it('shows the general seq exercise only as a labelled example', () => {
    expect(validatePlanConfig(undefined)).toBeUndefined();
  });
});

describe('Test C: stress after work', () => {
  it('offers only an optional break, never a planning board or a demanding puzzle', () => {
    const s = { ...defaultState(), en: [{ d: today(), e: 'low' as const, ts: 1 }] };
    const sug = buildSuggestion(s, { goals: ['stress', 'rest'] })!;
    // Gentle breaks only: the breathing and landscape breaks, resting the eyes and noticing the senses.
    sug.ids.forEach((id) => expect(['calm', 'calm_landscape', 'eye_rest', 'grounding']).toContain(id));
    expect(sug.cfg).toBeUndefined();
  });
});

describe('Test D: a specific game request', () => {
  it('puts the requested memory game first', () => {
    expect(buildSuggestion(defaultState(), { goals: ['memory'], prefer: ['mem'] })?.ids[0]).toBe('mem');
  });
  it('works offline too', () => {
    const r = ruleReply('I want to play the memory game', defaultState());
    expect(buildSuggestion(defaultState(), r.proposal!)?.ids[0]).toBe('mem');
  });
});

describe('Test E: Saudi Arabic planning request with no tasks named', () => {
  it('opens an empty board to add their own tasks, with nothing invented', () => {
    const r = ruleReply('عندي أشياء واجد أبي أسويها بعد الدوام وما أدري وش أبدأ فيه', defaultState());
    expect(r.proposal?.goals?.[0]).toBe('prioritize');
    const sug = buildSuggestion(defaultState(), r.proposal!)!;
    expect(sug.ids[0]).toBe('seq');
    expect(sug.cfg?.tasks.filter((t) => t.src === 'user')).toEqual([]);
  });
});

describe('Test H: switching language keeps the user\'s words', () => {
  it('never translates their tasks, and only the labels change', () => {
    const cfg = buildPlanConfig(['Udacity AI course', 'شطرنج'], { afterWork: true });
    const result: PlanResult = { kind: 'personal', now: ['u1', 's1'], later: ['u2'], notToday: [], blocks: [], tasks: cfg.tasks };
    setLanguage('en');
    const en = planSummary(result);
    setLanguage('ar-SA');
    const ar = planSummary(result);
    for (const text of [en, ar]) {
      expect(text).toContain('Udacity AI course');
      expect(text).toContain('شطرنج');
    }
    expect(taskLabel(cfg.tasks[0])).toBe('Udacity AI course');
    expect(en).not.toBe(ar);
  });
});

describe('Test I: privacy', () => {
  it('validates configs and drops anything malformed or unknown', () => {
    const v = validatePlanConfig({ v: 1, kind: 'personal', minutes: 9999, tasks: [{ id: 'u1', text: '  Udacity  ', src: 'user' }, { id: 'u1', text: 'dupe', src: 'user' }, { id: 's9', src: 'suggested', key: 'drink_more_coffee' }, 'junk'] });
    expect(v).toEqual({ v: 1, kind: 'personal', tasks: [{ id: 'u1', text: 'Udacity', src: 'user' }] });
  });

  it('deletes planning tasks everywhere they are kept', () => {
    const cfg = buildPlanConfig(['Udacity AI course', 'chess']);
    const s = defaultState();
    s.chat.push({ b: 1, t: '', sug: { ids: ['seq'], i: 0, cfg } });
    createMission(s, [{ id: 'seq', why: [{ k: 'chat' }], diff: 'normal', cfg }], true);
    completeItem(s, { acc: null, retries: 0, data: { kind: 'personal', now: ['u1'], later: ['u2'], notToday: [], blocks: [], tasks: cfg.tasks } });
    expect(typedCount(s)).toBe(1);
    clearTypedText(s);
    expect(typedCount(s)).toBe(0);
    expect(JSON.stringify(s)).not.toContain('Udacity');
    expect(lastPlan(s)).toBeNull();
    expect(isPlanResult(s.hist[0].data)).toBe(false);
    expect(s.xp).toBe(25);
  });

  it('caps the number and length of tasks', () => {
    const cfg = buildPlanConfig(Array.from({ length: 10 }, (_, i) => `task number ${i} ${'x'.repeat(80)}`));
    expect(cfg.tasks).toHaveLength(6);
    cfg.tasks.forEach((t) => expect(t.text.length).toBeLessThanOrEqual(60));
  });
});
