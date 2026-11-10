import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { handleChat } from '../server/chat';
import { CHALLENGES } from '../src/features/challenges/catalog';
import { buildChatRequest } from '../src/features/companion/request';
import { completeItem, createMission } from '../src/features/mission/engine';
import {
  buildPlan, completePlay, completeReflect, completeTalk, currentNode, earnedXp, extendPlan, nodeState, pathItem, potentialXp, replan, validPlan, type PathPlan,
} from '../src/features/path/planner';
import { clearTypedText } from '../src/features/plan/privacy';
import { acknowledge, needsCheckIn } from '../src/features/prayer/gate';
import { prayerTimes } from '../src/features/prayer/times';
import { emptyProfile, optionsFor, questionsFor, suggestWhen, toLegacy, validProfile, type LifeProfile } from '../src/features/profile/questions';
import { canRest, pendingMilestone, streakOf, takeRest, undoRest } from '../src/features/streak/streak';
import { defaultState, hydrate } from '../src/services/storage';
import type { AppState, Attempt, ChallengeId } from '../src/types';

const prof = (p: Partial<LifeProfile>): LifeProfile => ({ ...emptyProfile(), at: 1, ...p });
const ids = (plan: PathPlan) => plan.nodes.flatMap((n) => (n.id ? [n.id] : []));
const firstPlay = (plan: PathPlan) => plan.nodes.find((n) => n.kind === 'play')!.id;
const attempt = (id: ChallengeId, ts: number, status: Attempt['status'] = 'COMPLETED'): Attempt => ({ mid: 'm', id, status, acc: null, retries: 0, xp: 10, dur: 30, d: '', ts });
const state = (p: Partial<AppState> = {}): AppState => ({ ...defaultState(), city: 'riyadh', ...p });
// Noon in Riyadh on a given day of November 2026.
const day = (d: number) => new Date(Date.UTC(2026, 10, d, 9));
const play = (s: AppState, d: number, id: ChallengeId = 'calm') => s.hist.push(attempt(id, day(d).getTime()));

/** Plays the current step through the real mission engine. */
function playCurrent(s: AppState, acc: number | null = null) {
  const n = currentNode(s.path)!;
  createMission(s, [pathItem(s, n)], true);
  return completeItem(s, { acc, retries: 0 });
}

describe('Test 1: university student', () => {
  const p = prof({ life: ['uni'], goals: ['organize', 'start'], primary: 'start', hard: ['delay'] });
  it('offers study times, never work ones', () => {
    expect(optionsFor('when', p)).toContain('after_class');
    expect(optionsFor('when', p)).not.toContain('after_work');
  });
  it('builds a study journey of real, playable steps', () => {
    const plan = buildPlan(p);
    expect(plan.themes[0]).toBe('study');
    expect(ids(plan)).toContain('study_sprint');
    ids(plan).forEach((id) => expect(CHALLENGES[id]).toBeDefined());
    expect(firstPlay(plan)).toBe('micro_start');
  });
});

describe('Test 2: working adult', () => {
  const p = prof({ life: ['work'], goals: ['organize'], when: ['after_work'] });
  it('offers after work and invents no timetable', () => {
    expect(optionsFor('when', p)).not.toContain('after_class');
    expect(JSON.stringify(buildPlan(p))).not.toMatch(/\d{1,2}:\d{2}|university|lecture/i);
  });
  it('plans around work and has no study practice', () => {
    const plan = buildPlan(p);
    expect(plan.themes[0]).toBe('work');
    expect(ids(plan)).not.toContain('study_sprint');
    expect(firstPlay(plan)).toBe('breakdown');
  });
  it('uses their real tasks only when they kept some', () => {
    const plan = buildPlan({ ...p, tasks: ['Udacity AI course', 'chess'] });
    const n = plan.nodes.find((x) => x.id === 'seq')!;
    expect(n.cfg?.tasks.map((t) => t.text)).toEqual(['Udacity AI course', 'chess']);
    expect(buildPlan(p).nodes.some((x) => x.cfg)).toBe(false);
  });
  it('suggests a time only from what was said', () => {
    expect(suggestWhen(p)).toBe('after_work');
    expect(suggestWhen(prof({ life: ['skip'] }))).toBeNull();
  });
});

describe('Test 3: sleep routine', () => {
  const p = prof({ goals: ['sleep'], sleep: 'late' });
  it('gives a calm journey with nothing demanding', () => {
    const plan = buildPlan(p);
    expect(plan.themes[0]).toBe('sleep');
    expect(plan.nodes.slice(0, 2).every((n) => n.id === 'calm_landscape' || n.id === 'calm')).toBe(true);
  });
  it('stores the answer as a report, not a condition', () => {
    expect(toLegacy(p)).toMatchObject({ sleep: 'late', needs: ['sleep'] });
    expect(JSON.stringify(p)).not.toMatch(/insomnia/i);
  });
  it('tells the AI to raise sleep only when relevant, and never to promise results', () => {
    const prompt = readFileSync('server/prompt.ts', 'utf8');
    expect(prompt).toMatch(/Mention sleep only when it's relevant/);
    expect(prompt).toMatch(/Never promise that a habit fixes sleep/);
  });
});

describe('Test 4: different people, different starts', () => {
  it('gives each need a different first step and only real challenges', () => {
    const plans = [
      prof({ life: ['uni'], goals: ['focus'] }), prof({ life: ['work'], goals: ['organize'] }), prof({ goals: ['stress'], style: ['calm'] }),
      prof({ goals: ['start'] }), prof({ goals: ['focus'], life: ['flex'] }),
    ].map((p) => buildPlan(p));
    expect(new Set(plans.map((x) => ids(x).join())).size).toBe(plans.length);
    plans.flatMap(ids).forEach((id) => expect(Object.hasOwn(CHALLENGES, id)).toBe(true));
  });
  it('asks at most six questions, without repeating itself', () => {
    expect(questionsFor(prof({ life: ['uni'], goals: ['focus', 'sleep'] }))).toEqual(['life', 'goals', 'primary', 'tasks', 'when', 'style']);
    expect(questionsFor(prof({ life: ['skip'], goals: ['stress'] }))).toEqual(['life', 'goals', 'when', 'style']);
  });
  it('still uses answers saved before those questions were removed', () => {
    expect(firstPlay(buildPlan(prof({ goals: ['organize'], hard: ['tired'] })))).toBe('micro_start');
    expect(validProfile({ ...prof({ sleep: 'late', hard: ['thoughts'] }), follow: { q: 'free_work', a: 'weekend' } })).toMatchObject({ sleep: 'late', hard: ['thoughts'] });
  });
  it('only asks for a main goal when there are several', () => {
    expect(questionsFor(prof({ goals: ['focus'] }))).not.toContain('primary');
    expect(questionsFor(prof({ goals: ['focus', 'sleep'] }))).toContain('primary');
  });
  it('respects how someone likes to be helped', () => {
    expect(buildPlan(prof({ goals: ['organize'], style: ['talk'] })).nodes[0].kind).toBe('talk');
    expect(firstPlay(buildPlan(prof({ goals: ['organize'], style: ['calm'] })))).toBe('calm_landscape');
  });
  it('starts someone worn out gently', () => {
    expect(firstPlay(buildPlan(prof({ goals: ['focus'], hard: ['tired'] })))).toBe('calm_landscape');
  });
  it('has a gentle start with no answers at all, and invents no tasks', () => {
    const plan = buildPlan(emptyProfile());
    expect(plan.themes[0]).toBe('gentle');
    expect(plan.nodes.some((n) => n.cfg)).toBe(false);
  });
});

describe('Test 5: journey progression', () => {
  const setup = () => state({ path: buildPlan(prof({ life: ['work'], goals: ['organize'] })) });
  it('marks the step done with the XP really earned, once', () => {
    const s = setup();
    const n = currentNode(s.path)!;
    const potential = potentialXp(n);
    expect(playCurrent(s)?.xp).toBe(potential);
    expect(s.path!.nodes[0].done?.xp).toBe(potential);
    expect(earnedXp(s.path!)).toBe(potential);
    // A repeated completion event changes nothing.
    expect(completeItem(s, { acc: null, retries: 0 })).toBeNull();
    expect(completePlay(s, n.key, 999)).toBe(false);
    expect(s.xp).toBe(potential);
    expect(earnedXp(s.path!)).toBe(potential);
  });
  it('records the lower XP when that is what was earned', () => {
    const s = state({ path: buildPlan(prof({ goals: ['focus'] })) });
    const n = currentNode(s.path)!;
    playCurrent(s, 20);
    expect(s.path!.nodes[0].done!.xp).toBeLessThan(CHALLENGES[n.id!].xp);
  });
  it('opens the next step only after the current one', () => {
    const s = setup();
    const [a, b] = s.path!.nodes;
    expect([nodeState(s.path!, a), nodeState(s.path!, b)]).toEqual(['current', 'locked']);
    expect(completePlay(s, b.key, 20)).toBe(false);
    playCurrent(s);
    expect([nodeState(s.path!, a), nodeState(s.path!, b)]).toEqual(['done', 'current']);
  });
  it('does not touch the journey when the same game is played from the library', () => {
    const s = setup();
    const id = currentNode(s.path)!.id!;
    createMission(s, [{ id, why: [{ k: 'self' }], diff: 'normal' }], true);
    completeItem(s, { acc: null, retries: 0 });
    expect(currentNode(s.path)!.done).toBeUndefined();
  });
  it('reaches a milestone only by finishing the chapter, for no extra XP', () => {
    const s = setup();
    while (currentNode(s.path)!.kind === 'play') playCurrent(s);
    const r = currentNode(s.path)!;
    expect(r.kind).toBe('reflect');
    const mile = s.path!.nodes.find((n) => n.kind === 'milestone')!;
    expect(mile.done).toBeUndefined();
    const xp = s.xp;
    completeReflect(s, r.key);
    expect(mile.done?.xp).toBe(0);
    expect(s.xp).toBe(xp);
  });
  it('finishes a talk step only when a message is really sent', () => {
    const s = state({ path: buildPlan(prof({ goals: ['organize'], style: ['talk'] })) });
    expect(s.path!.nodes[0].done).toBeUndefined();
    completeTalk(s);
    expect(s.path!.nodes[0].done).toBeDefined();
  });
  it('keeps finished steps when the journey is revised', () => {
    const s = setup();
    playCurrent(s);
    const before = s.path!.nodes[0];
    const next = replan(s.path, prof({ goals: ['sleep'] }));
    expect(next.nodes[0]).toEqual(before);
    expect(currentNode(next)!.id).toBe('calm_landscape');
    expect(new Set(next.nodes.map((n) => n.key)).size).toBe(next.nodes.length);
  });
  it('adds a chapter only after everything is done', () => {
    const s = setup();
    const len = s.path!.nodes.length;
    extendPlan(s, s.prof);
    expect(s.path!.nodes.length).toBe(len);
  });
  it('drops a corrupted journey rather than showing false progress', () => {
    expect(validPlan({ v: 1, themes: [], nodes: [{ key: 'x', kind: 'play', id: 'nope', ch: 0 }] })).toBeNull();
  });
});

describe('Test 6: daily streak', () => {
  it('counts a day once, however many challenges were played', () => {
    const s = state();
    play(s, 1); play(s, 1, 'time'); play(s, 1, 'mem');
    expect(streakOf(s, day(1))).toMatchObject({ current: 1, longest: 1, todayDone: true });
  });
  it('continues the next day, with XP independent of it', () => {
    const s = state();
    play(s, 1); play(s, 2);
    expect(streakOf(s, day(2)).current).toBe(2);
  });
  it('does not end a streak just because today is still open', () => {
    const s = state();
    play(s, 1); play(s, 2);
    expect(streakOf(s, day(3)).current).toBe(2);
  });
  it('counts only real completions', () => {
    const s = state({ hist: [attempt('calm', day(1).getTime(), 'SKIPPED'), attempt('calm', day(1).getTime(), 'ABANDONED'), attempt('emotion_map', day(1).getTime())] });
    expect(streakOf(s, day(1)).current).toBe(0);
  });
  it('uses the local calendar day of the chosen place', () => {
    // 22:30 UTC on the 1st is already the 2nd in Riyadh.
    const s = state({ hist: [attempt('calm', Date.UTC(2026, 10, 1, 22, 30))] });
    expect(streakOf(s, day(2)).todayDone).toBe(true);
    const lon = state({ city: '', loc: { lat: 51.5, lng: 0, tz: 'Europe/London' }, hist: [attempt('calm', Date.UTC(2026, 10, 1, 22, 30))] });
    expect(streakOf(lon, day(2)).todayDone).toBe(false);
  });
  it('celebrates each milestone once', () => {
    const s = state();
    [1, 2, 3].forEach((d) => play(s, d));
    expect(pendingMilestone(s, day(3))?.id).toBe('spark');
    s.streakSeen = 3;
    expect(pendingMilestone(s, day(3))).toBeNull();
    play(s, 4); play(s, 5); play(s, 6); play(s, 7);
    expect(pendingMilestone(s, day(7))?.id).toBe('flame');
  });
});

describe('Test 7: rest days', () => {
  it('keeps the streak on a chosen rest day, adds nothing and invents nothing', () => {
    const s = state();
    play(s, 1); play(s, 2);
    expect(takeRest(s, day(3))).toBe(true);
    play(s, 4);
    const v = streakOf(s, day(4));
    expect(v.current).toBe(3);
    expect(v.marks['2026-11-03']).toBe('rest');
    expect(s.hist).toHaveLength(3);
    expect(s.xp).toBe(0);
  });
  it('allows two rest days in any seven, and can be undone', () => {
    const s = state();
    expect(takeRest(s, day(1))).toBe(true);
    expect(takeRest(s, day(2))).toBe(true);
    expect(canRest(s, day(3))).toBe(false);
    expect(canRest(s, day(8))).toBe(true);
    undoRest(s, day(2));
    expect(s.rest).toHaveLength(1);
  });
  it('protects one missed day, then a second in a row ends it, without a penalty anywhere', () => {
    const s = state({ xp: 50 });
    play(s, 1); play(s, 2); play(s, 4);
    let v = streakOf(s, day(4));
    expect(v.current).toBe(3);
    expect(v.marks['2026-11-03']).toBe('protected');
    v = streakOf(s, day(7));
    expect(v.current).toBe(0);
    expect(v.longest).toBe(3);
    expect(s.xp).toBe(50);
  });
  it('protects nothing when grace is off', () => {
    const s = state({ streakGrace: 0 });
    play(s, 1); play(s, 3);
    expect(streakOf(s, day(3)).current).toBe(1);
  });
  it('has no guilt in its wording', () => {
    for (const lang of ['en', 'ar-SA']) expect(readFileSync(`src/i18n/locales/${lang}/streak.json`, 'utf8')).not.toMatch(/lost|broke|failed|don't lose|ضاع|خسرت/i);
  });
});

describe('Test 8: prayer', () => {
  it('is no longer asked in onboarding, and stays in Settings', () => {
    expect(readFileSync('src/pages/Onboarding/index.tsx', 'utf8')).not.toMatch(/PrayerSetup|settings\.protectLabel/);
    expect(readFileSync('src/pages/Settings/index.tsx', 'utf8')).toMatch(/PrayerSetup/);
  });
  it('earns no XP or streak from a prayer answer', () => {
    const t = prayerTimes('riyadh', day(1))!;
    const s = state({ pp: 30 });
    acknowledge(s, needsCheckIn(s, new Date(t.asr.getTime() + 60_000)), 'prayed');
    expect(s.xp).toBe(0);
    expect(streakOf(s, day(1)).current).toBe(0);
  });
});

describe('Test 9: both languages', () => {
  const load = (l: string) => JSON.parse(readFileSync(`src/i18n/locales/${l}/profile.json`, 'utf8'));
  it('has every choice and question in both, with the brief\'s wording', () => {
    const [en, ar] = [load('en'), load('ar-SA')];
    expect(ar.q.life.title).toBe('وش يشغل أغلب يومك؟');
    expect(en.q.goals.title).toBe('What would you like Zaho to help you with?');
    expect(ar.opt.style.talk).toBe('نسولف ونفكر بحل');
    for (const q of ['life', 'goals', 'when', 'style']) {
      const p = prof({ life: ['uni', 'work'] });
      optionsFor(q as 'life', p).forEach((o) => { expect(en.opt[q][o]).toBeTruthy(); expect(ar.opt[q][o]).toBeTruthy(); });
    }
  });
  it('stores stable IDs, never words', () => {
    expect(JSON.stringify(buildPlan(prof({ goals: ['stress'] })))).not.toMatch(/[؀-ۿ]/);
  });
});

describe('Test 10: existing users', () => {
  const old = { started: 1, done: 1, name: 'Sara', xp: 240, hist: [attempt('mem', day(1).getTime())], needs: ['adhd'], pp: 45, city: 'jeddah' } as Partial<AppState>;
  it('keeps everything and silently builds no journey', () => {
    const s = hydrate(old);
    expect(s).toMatchObject({ xp: 240, name: 'Sara', needs: ['adhd'], pp: 45, city: 'jeddah', prof: null, path: null });
    expect(s.hist).toHaveLength(1);
    expect(currentNode(s.path)).toBeNull();
  });
  it('gets a real streak from existing history', () => {
    expect(streakOf(hydrate(old), day(1)).current).toBe(1);
  });
  it('drops malformed saved answers', () => {
    expect(validProfile({ v: 1, life: ['astronaut', 'uni'], goals: ['adhd', 'focus'], sleep: 'never', tasks: [5, 'x'] })).toMatchObject({ life: ['uni'], goals: ['focus'], sleep: null, tasks: ['x'] });
    expect(validProfile({ v: 2 })).toBeNull();
  });
});

describe('Privacy and the AI', () => {
  it('deletes kept tasks everywhere', () => {
    const p = prof({ goals: ['organize'], tasks: ['Udacity', 'chess'] });
    const s = state({ prof: p, path: buildPlan(p) });
    clearTypedText(s);
    expect(JSON.stringify(s)).not.toMatch(/Udacity|chess/);
  });
  it('gives the model the user\'s answers, and only known values', async () => {
    const seen: { input: { content: string }[] }[] = [];
    const f = vi.fn(async (url: string, init: { body: string }) => {
      if (String(url).endsWith('/moderations')) return Response.json({ results: [{ categories: {} }] });
      seen.push(JSON.parse(init.body));
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ reply: 'Hi', tone: 'friendly', distress: false, context: {} }) }] }] });
    }) as unknown as typeof fetch;
    const s = state({ prof: prof({ life: ['uni'], goals: ['organize'], style: ['talk'] }) });
    const req = buildChatRequest('hello', s) as { context: Record<string, unknown> };
    await handleChat({ ...req, context: { ...req.context, about: { ...(req.context.about as object), life: ['uni', 'diagnosed_adhd'] } } }, { apiKey: 'test-key-not-real', fetch: f });
    const ctx = seen[0].input[0].content;
    expect(ctx).toContain('"daily_life":["uni"]');
    expect(ctx).toContain('"help_style":["talk"]');
    expect(ctx).not.toMatch(/diagnosed_adhd/);
  });
});

describe('smart replies', () => {
  const chat = readFileSync('src/pages/Companion/index.tsx', 'utf8');
  const load = (l: string) => JSON.parse(readFileSync(`src/i18n/locales/${l}/companion.json`, 'utf8'));

  it('run whenever the AI service is available, with no consent question in the chat or onboarding', () => {
    expect(chat).toContain('const useAi = aiReady;');
    expect(chat).not.toContain('aiConsent');
    expect(readFileSync('src/pages/Onboarding/index.tsx', 'utf8')).not.toContain('aiConsent');
    for (const l of ['en', 'ar-SA']) expect(load(l).consent).toBeUndefined();
  });

  it('no longer say under the chat title where replies come from; only the limited mode is announced', () => {
    expect(chat).not.toContain('companion.statusAi');
    expect(chat).toContain("{!useAi && <span className=\"status status--limited\">");
    for (const l of ['en', 'ar-SA']) expect(load(l).statusAi).toBeUndefined();
  });
});
