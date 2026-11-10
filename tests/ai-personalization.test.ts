import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { acceptOutput, handleChat } from '../server/chat';
import { REPLY_SCHEMA } from '../server/prompt';
import { CHALLENGES } from '../src/features/challenges/catalog';
import { buildChatRequest } from '../src/features/companion/request';
import { effectiveId, pickDhikr } from '../src/features/dhikr/pick';
import { createMission, beginItem, completeItem, advance, finishMission } from '../src/features/mission/engine';
import { ADAPT_COOLDOWN, adaptJourney, avoidOf, buildPlan, currentNode, timedView, type PathPlan } from '../src/features/path/planner';
import { emptyProfile, type LifeProfile } from '../src/features/profile/questions';
import { feedbackScore, recommend } from '../src/features/recommend/engine';
import { CHALLENGE_META } from '../src/features/recommend/goals';
import { buildSuggestion } from '../src/features/recommend/suggest';
import { mergeFeedback, newerJourney, stable } from '../src/services/dailySync';
import { defaultState } from '../src/services/storage';
import type { AppState, ChallengeId, Feedback } from '../src/types';

const at = (h: number, m = 0) => new Date(2026, 10, 11, h, m);
const prof = (p: Partial<LifeProfile>): LifeProfile => ({ ...emptyProfile(), at: 1, ...p });
const state = (p: Partial<AppState> = {}): AppState => ({ ...defaultState(), city: 'riyadh', ...p });
const fb = (id: ChallengeId, v: 1 | 0 | -1, ts = Date.now() - 1000): Feedback => ({ id, v, ts });
const ids = (plan: PathPlan) => plan.nodes.filter((n) => n.kind === 'play').map((n) => n.id);

describe('1. the first journey comes from the onboarding answers', () => {
  it('builds from the answers, only with active challenges, and avoids ones the user disliked', () => {
    const p = prof({ life: ['uni'], goals: ['focus'], primary: 'focus' });
    const plan = buildPlan(p, 1);
    expect(plan.themes[0]).toBe('study');
    for (const id of ids(plan)) expect(CHALLENGES[id!].retired).toBeFalsy();
    const first = ids(plan)[0]!;
    const again = buildPlan(p, 1, [first]);
    expect(ids(again)).not.toContain(first);
  });

  it('never puts dhikr into a journey built from onboarding (it is never forced)', () => {
    for (const g of ['organize', 'focus', 'start', 'stress', 'sleep', 'social', 'habits', 'other'] as const) {
      expect(ids(buildPlan(prof({ goals: [g], primary: g }), 1)).some((id) => id!.startsWith('dhikr_'))).toBe(false);
    }
  });
});

describe('2 and 9. adjusting the journey from the chat', () => {
  const base = () => {
    const s = state({ prof: prof({ life: ['uni'], goals: ['focus'], primary: 'focus' }) });
    s.path = buildPlan(s.prof!, 1);
    // The first play step is already done, with its XP.
    const first = s.path.nodes.find((n) => n.kind === 'play')!;
    first.done = { at: 2, xp: 25 };
    return s;
  };

  it('swaps at most two upcoming steps in the current chapter for sleep challenges, keeping what is done', () => {
    const s = base();
    const done = structuredClone(s.path!.nodes.filter((n) => n.done));
    const r = adaptJourney(s, 'sleep', { now: 10 })!;
    expect(r).not.toBeNull();
    expect(r.change.swapped.length).toBeGreaterThan(0);
    expect(r.change.swapped.length).toBeLessThanOrEqual(2);
    for (const w of r.change.swapped) expect(CHALLENGE_META[w.to].goals).toContain('sleep');
    // Done steps, their XP, the number of steps and the chapters stay as they were.
    expect(r.plan.nodes.filter((n) => n.done)).toEqual(done);
    expect(r.plan.nodes.length).toBe(s.path!.nodes.length);
    expect(r.plan.nodes.map((n) => n.ch)).toEqual(s.path!.nodes.map((n) => n.ch));
    expect(r.plan.themes[0]).toBe('sleep');
    expect(r.plan.adapted).toEqual({ goal: 'sleep', at: 10 });
    // The original state isn't touched until the change is saved.
    expect(s.path!.adapted).toBeUndefined();
  });

  it('changes nothing, and claims nothing, when asked again for the same need soon after', () => {
    const s = base();
    s.path = adaptJourney(s, 'sleep', { now: 10 })!.plan;
    expect(adaptJourney(s, 'sleep', { now: 20 })).toBeNull();
    // Later, the same need changes nothing either: the current chapter already fits it.
    expect(adaptJourney(s, 'sleep', { now: 10 + ADAPT_COOLDOWN + 1 })).toBeNull();
    // A different need can still adjust it.
    expect(adaptJourney(s, 'stress', { now: 30 })).not.toBeNull();
  });

  it('never brings in a challenge the user said did not suit them', () => {
    const s = base();
    s.fb = [fb('calm', -1)];
    const r = adaptJourney(s, 'sleep', { now: 10 })!;
    expect(r.change.swapped.map((w) => w.to)).not.toContain('calm');
    expect(avoidOf(s)).toEqual(['calm']);
  });

  it('returns nothing for a finished journey, so nothing is claimed', () => {
    const s = base();
    s.path!.nodes.forEach((n) => { n.done = { at: 1, xp: 0 }; });
    expect(adaptJourney(s, 'sleep', { now: 10 })).toBeNull();
  });
});

describe('3. one challenge versus the journey', () => {
  it('a single request gives exactly one card', () => {
    const s = state();
    const sug = buildSuggestion(s, { prefer: ['video', 'attention_scene', 'mem'], goals: ['focus'], single: true })!;
    expect(sug.ids).toEqual(['video']);
    const many = buildSuggestion(s, { prefer: ['video', 'attention_scene', 'mem'], goals: ['focus'] })!;
    expect(many.ids.length).toBe(3);
  });

  it('a dhikr the user named works even outside its time; an unnamed one does not', () => {
    const s = state();
    const evening = at(19).getTime();
    expect(recommend(s, { prefer: ['dhikr_morning'], explicit: ['dhikr_morning'], now: evening })[0].id).toBe('dhikr_morning');
    expect(recommend(s, { prefer: ['dhikr_morning'], now: evening }).some((r) => r.id === 'dhikr_morning')).toBe(false);
  });

  it('the server keeps one ID for a single request, and only accepts a real goal for a journey change', () => {
    const base = { reply: 'x', reply_language: 'ar', intent: 'activity_request', tone: 'friendly', distress: false, goals: [], tasks: [], available_minutes: null, context: { event: false, work: false, sleep: false, low_energy: false } };
    const single = acceptOutput(JSON.stringify({ ...base, suggest: { challenge_ids: ['video', 'mem'], reason: '' }, journey: { action: 'single', focus: 'none', named: false, include_dhikr: false } }));
    expect(single.suggest?.ids).toEqual(['video']);
    expect(single.journey).toEqual({ action: 'single', named: false });
    const adjust = acceptOutput(JSON.stringify({ ...base, suggest: { challenge_ids: [], reason: '' }, journey: { action: 'adjust', focus: 'sleep', named: false, include_dhikr: false } }));
    expect(adjust.journey).toEqual({ action: 'adjust', focus: 'sleep', dhikr: false });
    const bogus = acceptOutput(JSON.stringify({ ...base, suggest: { challenge_ids: [], reason: '' }, journey: { action: 'adjust', focus: 'cure', named: false, include_dhikr: false } }));
    expect(bogus.journey).toBeUndefined();
  });

  it('asks the model for the journey field in its output', () => {
    expect(REPLY_SCHEMA.required).toContain('journey');
    expect(REPLY_SCHEMA.properties.journey.properties.action.enum).toEqual(['none', 'single', 'adjust']);
  });
});

describe('4. the challenge guide', () => {
  it('only offers challenges that are active, as the guide says', () => {
    const guide = readFileSync('docs/ZAHO_CHALLENGE_GUIDE.md', 'utf8');
    for (const id of ['priority_board', 'time', 'start2', 'eye_break']) {
      expect(guide).toContain(`\`${id}\``);
      expect(CHALLENGES[id as ChallengeId].retired).toBe(true);
      expect(recommend(state(), { prefer: [id as ChallengeId] }).some((r) => r.id === id)).toBe(false);
    }
  });
});

describe('5. learning from "did it suit you?"', () => {
  it('"okay" lowers a challenge a little and rests it for the day, "did not suit me" lowers it a lot', () => {
    expect(feedbackScore(state({ fb: [fb('calm', 1)] }), 'calm')).toBeGreaterThan(0);
    const okay = feedbackScore(state({ fb: [fb('calm', 0)] }), 'calm');
    const no = feedbackScore(state({ fb: [fb('calm', -1)] }), 'calm');
    expect(okay).toBeLessThan(0);
    expect(no).toBeLessThan(okay);
    const s = state({ fb: [fb('calm', 0)] });
    expect(recommend(s, { goals: ['stress'] }).some((r) => r.id === 'calm')).toBe(false);
    // Not permanent: a day later it can come back, and the user can always ask for it.
    const later = recommend(s, { goals: ['stress'], now: Date.now() + 2 * 864e5 });
    expect(later.some((r) => r.id === 'calm')).toBe(true);
    expect(recommend(s, { prefer: ['calm'], goals: ['stress'] })[0].id).toBe('calm');
  });

  it('"did not suit me" is left out when something else fits, but not when it is the only option', () => {
    const s = state({ fb: [fb('calm', -1, Date.now() - 3 * 864e5)] });
    expect(recommend(s, { goals: ['stress'] }).some((r) => r.id === 'calm')).toBe(false);
    expect(recommend(s, { goals: ['stress'], exclude: (Object.keys(CHALLENGES) as ChallengeId[]).filter((x) => x !== 'calm') }).map((r) => r.id)).toEqual(['calm']);
  });

  it('feedback from two devices is combined, each answer once', () => {
    const a = [fb('calm', 0, 1), fb('video', -1, 3)];
    const merged = mergeFeedback(a, [fb('video', -1, 3), fb('mem', 1, 2), { id: 'nope', v: 9, ts: 1 }]);
    expect(merged).toEqual([fb('calm', 0, 1), fb('mem', 1, 2), fb('video', -1, 3)]);
  });
});

describe('6 and 7. finishing a challenge is silent in the chat, but the companion still sees it', () => {
  it('posts nothing in the chat when a mission ends', () => {
    const s = state();
    createMission(s, [{ id: 'calm', why: [], diff: 'normal' }], true);
    beginItem(s);
    completeItem(s, { acc: null, retries: 0 });
    advance(s);
    finishMission(s);
    expect(s.chat).toHaveLength(0);
    expect(s.hist.some((h) => h.id === 'calm' && h.status === 'COMPLETED')).toBe(true);
  });

  it('sends recent completions, the journey and the latest answers, as IDs only', () => {
    const s = state({ prof: prof({ goals: ['sleep'], primary: 'sleep' }) });
    s.path = buildPlan(s.prof!, 1);
    s.hist = [{ mid: 'm', i: 0, id: 'calm', status: 'COMPLETED', acc: null, retries: 0, xp: 15, dur: 60, d: '', ts: at(9).getTime() } as AppState['hist'][number]];
    s.fb = [fb('calm', 0)];
    const ctx = (buildChatRequest('hi', s) as { context: Record<string, unknown> }).context;
    expect(ctx.recent).toEqual([{ id: 'calm', day: '2026-11-11' }]);
    expect((ctx.journey as { upcoming: string[] }).upcoming.length).toBeGreaterThan(0);
    expect(ctx.feedback).toEqual([{ id: 'calm', net: 0, last: 0 }]);
    expect(JSON.stringify(ctx)).not.toMatch(/Razan|"name"/);
  });

  it('the model sees them, with the latest answer in words', async () => {
    const seen: { input: { content: string }[] }[] = [];
    const f = vi.fn(async (url: string, init: { body: string }) => {
      if (String(url).endsWith('/moderations')) return Response.json({ results: [{ categories: {} }] });
      seen.push(JSON.parse(init.body));
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ reply: 'Hi', tone: 'friendly', distress: false, context: {} }) }] }] });
    }) as unknown as typeof fetch;
    const req = buildChatRequest('hi', state()) as { context: Record<string, unknown> };
    await handleChat({ ...req, context: { ...req.context, recent: [{ id: 'eye_rest', day: '2026-11-11' }], feedback: [{ id: 'calm', net: -1, last: -1 }] } }, { apiKey: 'test-key-not-real', fetch: f });
    const text = seen[0].input[0].content;
    const ctx = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    expect(ctx.recently_completed).toEqual([{ id: 'eye_rest', day: '2026-11-11' }]);
    expect(ctx.feedback[0].latest_answer).toBe('did not suit me');
  });
});

describe('10. dhikr by the user\'s local time', () => {
  it('picks the dhikr that fits the moment', () => {
    expect(pickDhikr(at(9))).toBe('dhikr_morning');
    expect(pickDhikr(at(19))).toBe('dhikr_evening');
    expect(pickDhikr(at(23, 30))).toBe('dhikr_sleep');
    expect(pickDhikr(at(21), 'sleep_now')).toBe('dhikr_sleep');
    expect(pickDhikr(at(14))).toBe('dhikr_moment');
    expect(pickDhikr(at(14), 'stress')).toBe('dhikr_calm_heart');
  });

  it('a timed dhikr step saved in the morning opens as the evening one in the evening, without rewriting the journey', () => {
    expect(effectiveId('dhikr_morning', at(19))).toBe('dhikr_evening');
    expect(effectiveId('dhikr_morning', at(9))).toBe('dhikr_morning');
    expect(effectiveId('calm', at(19))).toBe('calm');
    const plan: PathPlan = { v: 1, themes: ['gentle'], created: 1, nodes: [
      { key: 'a', kind: 'play', id: 'dhikr_morning', ch: 0, done: { at: 1, xp: 15 } },
      { key: 'b', kind: 'play', id: 'dhikr_morning', ch: 0 },
    ] };
    const view = timedView(plan, at(19));
    expect(view.nodes.map((n) => n.id)).toEqual(['dhikr_morning', 'dhikr_evening']);
    expect(plan.nodes[1].id).toBe('dhikr_morning');
    expect(currentNode(view)?.key).toBe('b');
  });

  it('adds a dhikr step only when asked, chosen by the time', () => {
    const s = state({ prof: prof({ goals: ['stress'], primary: 'stress' }) });
    s.path = buildPlan(s.prof!, 1);
    const morning = adaptJourney(s, 'rest', { dhikr: true, now: at(9).getTime() })!;
    expect(morning.change.dhikr).toBe('dhikr_morning');
    const evening = adaptJourney(s, 'rest', { dhikr: true, now: at(19).getTime() })!;
    expect(evening.change.dhikr).toBe('dhikr_evening');
    expect(ids(adaptJourney(s, 'sleep', { now: at(19).getTime() })?.plan ?? s.path).some((id) => id!.startsWith('dhikr_'))).toBe(false);
  });
});

describe('persistence', () => {
  it('the newer journey wins between devices', () => {
    const a: PathPlan = { v: 1, themes: [], nodes: [], created: 1, updated: 5 };
    const b: PathPlan = { ...a, updated: 9 };
    expect(newerJourney(a, b)).toBe('remote');
    expect(newerJourney(b, a)).toBe('local');
    expect(newerJourney(null, a)).toBe('remote');
    expect(newerJourney(a, null)).toBe('local');
  });
  it('compares saved JSON regardless of the key order Postgres uses', () => {
    expect(stable({ b: 1, a: { d: 2, c: 3 } })).toBe(stable({ a: { c: 3, d: 2 }, b: 1 }));
  });
  it('confirms a journey change only after it is saved, and puts it back if saving fails', () => {
    const page = readFileSync('src/pages/Companion/index.tsx', 'utf8');
    expect(page.indexOf('await saveJourneyNow(store)')).toBeLessThan(page.indexOf("tr('companion.journey.updated'"));
    expect(page).toMatch(/if \(!saved\) \{\s*store\.update\(\(d\) => \{ d\.path = before; d\.chat\.push\(\{ b: 1, t: tr\('companion\.journey\.failed'\)/);
  });
});

describe('rewards', () => {
  it('prices are four times higher; challenge points are unchanged', () => {
    const sql = readFileSync('supabase/migrations/20261111090100_reward_prices_x4.sql', 'utf8');
    expect(sql).toContain("('dunkin', 160), ('jarir', 320), ('vox', 480), ('extra', 600)");
    const seed = readFileSync('supabase/migrations/20261108090000_points_rewards.sql', 'utf8');
    for (const [id, old] of [['dunkin', 40], ['jarir', 80], ['vox', 120], ['extra', 150]] as const) expect(seed).toMatch(new RegExp(`\\('${id}',[^\\n]*?, ${old}, '`));
    expect(seed).toContain("values (uid, 10, 'challenge'");
  });
});
