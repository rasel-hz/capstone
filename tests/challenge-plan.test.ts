import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTIVE_IDS, CHALLENGES, GROUPS, JOURNEYS, MEM_ITEMS } from '../src/features/challenges/catalog';
import { crisisIn } from '../src/features/challenges/games/parts';
import { diffCount, makeRound } from '../src/features/challenges/games/AttentionSceneGame';
import { freshScene, makeScene, pickQuestions, questionBank, signature } from '../src/features/challenges/games/videoScene';
import { addLater, atClock, dueLater, laterTime } from '../src/features/later/later';
import { addFollowUp, beginItem, cleanSeed, completeItem, createMission, finishMission } from '../src/features/mission/engine';
import { generateMission } from '../src/features/mission/planner';
import { buildPlan } from '../src/features/path/planner';
import { emptyProfile, type LifeProfile } from '../src/features/profile/questions';
import { recommend } from '../src/features/recommend/engine';
import { defaultState, hydrate } from '../src/services/storage';
import type { AppState, ChallengeId } from '../src/types';

const fresh = (o: Partial<AppState> = {}): AppState => ({ ...defaultState(), ...o });
const RETIRED: ChallengeId[] = ['priority_board', 'time', 'start2'];
// A fixed sequence, so random scenes can be checked exactly.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('retired challenges', () => {
  it('stay in the catalog for old history, and nowhere else', () => {
    RETIRED.forEach((id) => {
      expect(CHALLENGES[id].retired).toBe(true);
      expect(ACTIVE_IDS).not.toContain(id);
      expect(GROUPS.flatMap((g) => g.ids)).not.toContain(id);
      expect(JOURNEYS.flatMap((j) => j.a)).not.toContain(id);
    });
  });

  it('are never recommended, planned or put on the map', () => {
    const goals = ['prioritize', 'start', 'focus', 'stress', 'sleep', 'worry', 'social', 'rest', 'memory', 'time'] as const;
    goals.forEach((g) => recommend(fresh(), { goals: [g] }).forEach((r) => expect(RETIRED).not.toContain(r.id)));
    for (const needs of [[], ['adhd'], ['mood']] as AppState['needs'][]) generateMission(fresh({ needs })).forEach((i) => expect(RETIRED).not.toContain(i.id));
    const mapGoals = ['organize', 'focus', 'start', 'stress', 'sleep', 'social', 'habits', 'other'] as const;
    mapGoals.forEach((g) => {
      const plan = buildPlan({ ...emptyProfile(), goals: [g], tasks: ['Report', 'Gym'] } as LifeProfile);
      plan.nodes.forEach((n) => n.id && expect(RETIRED).not.toContain(n.id));
    });
  });

  it('are kept from the AI, in the activity list and in its answer', () => {
    const chat = readFileSync('server/chat.ts', 'utf8');
    expect(chat).toMatch(/!CHALLENGES\[id\]\.retired/);
    expect(readFileSync('server/prompt.ts', 'utf8')).toMatch(/enum: ACTIVE_IDS/);
  });
});

describe('effort and follow-ups', () => {
  it('scales level points by the effort reported', () => {
    const s = fresh();
    createMission(s, [{ id: 'micro_start', why: [], diff: 'normal' }], true);
    beginItem(s);
    expect(completeItem(s, { acc: null, retries: 0, xpScale: 0.3 })?.xp).toBe(Math.round(CHALLENGES.micro_start.xp * 0.3));
  });

  it('adds the chosen next challenge right after, once, with only clean text', () => {
    const s = fresh();
    createMission(s, [{ id: 'breakdown', why: [], diff: 'normal' }, { id: 'calm', why: [], diff: 'normal' }], false);
    beginItem(s);
    completeItem(s, { acc: null, retries: 0 });
    const then = { id: 'micro_start' as const, seed: { task: '  Report  ', step: 'Open it', from: 'breakdown' as const } };
    addFollowUp(s, then);
    addFollowUp(s, then);
    expect(s.mission!.items.map((i) => i.id)).toEqual(['breakdown', 'micro_start', 'calm']);
    expect(s.mission!.items[1]).toMatchObject({ extra: 1, seed: { task: 'Report', step: 'Open it', from: 'breakdown' } });
    addFollowUp(s, { id: 'start2' });
    expect(s.mission!.items).toHaveLength(3);
  });

  it('does not make a mission partial when an added challenge is left', () => {
    const s = fresh();
    createMission(s, [{ id: 'study_sprint', why: [], diff: 'normal' }], true);
    beginItem(s);
    completeItem(s, { acc: null, retries: 0 });
    addFollowUp(s, { id: 'calm_landscape' });
    expect(finishMission(s).all).toBe(true);
  });

  it('cleans a saved seed', () => {
    expect(cleanSeed({ task: 'x'.repeat(300), from: 'nope', option: 'move', extra: 'bad' })).toEqual({ task: 'x'.repeat(100), option: 'move' });
    expect(cleanSeed({ option: 'DROP TABLE' })).toBeUndefined();
    expect(cleanSeed(null)).toBeUndefined();
  });
});

describe('typed text is checked on the device', () => {
  it('finds crisis wording in any field', () => {
    expect(crisisIn('Report', 'I want to die')).toBe(1);
    expect(crisisIn('Report', undefined, 'Gym')).toBe(0);
  });

  it('is checked in every challenge with free text', () => {
    for (const g of ['MicroStartGame', 'BreakdownGame', 'ThoughtSortGame', 'EmotionMapGame', 'StudySprintGame', 'SequenceGame']) {
      expect(readFileSync(`src/features/challenges/games/${g}.tsx`, 'utf8'), g).toMatch(/crisisIn\(/);
    }
  });
});

describe('"Focus for a moment" scenes', () => {
  it('has 2 to 5 balloons, fewer things when easy, and every event at its own moment', () => {
    for (let i = 1; i < 60; i++) {
      const s = makeScene(false, seeded(i));
      expect(s.balloons.length).toBeGreaterThanOrEqual(2);
      expect(s.balloons.length).toBeLessThanOrEqual(5);
      const times = [...s.balloons.map((b) => b.t), ...s.birds.map((b) => b.t), ...(s.star ? [s.star.t] : [])];
      expect(new Set(times).size).toBe(times.length);
      const e = makeScene(true, seeded(i));
      expect(e.balloons.length).toBeLessThanOrEqual(3);
      expect(e.camel).toBeNull();
    }
  });

  it('asks only about what was shown, with the answer among the options', () => {
    for (let i = 1; i < 60; i++) {
      const s = makeScene(false, seeded(i));
      questionBank(s, seeded(i)).forEach((q) => expect(q.o, q.id).toContain(q.a));
      const qs = pickQuestions(s, false, seeded(i));
      expect(qs).toHaveLength(3);
      expect(new Set(qs.map((q) => q.id)).size).toBe(3);
      expect(pickQuestions(s, true, seeded(i))).toHaveLength(2);
    }
    const one = makeScene(false, seeded(7));
    expect(questionBank(one).find((q) => q.id === 'balloons')!.a).toBe(String(one.balloons.length));
  });

  it('never repeats the scene from last time', () => {
    const r = seeded(3);
    const last = signature(makeScene(false, seeded(3)));
    expect(signature(freshScene(false, last, r))).not.toBe(last);
  });
});

describe('"What changed?" rounds', () => {
  it('has the asked number of differences, of varied kinds, and nudges every object', () => {
    const scenes = ['oasis', 'majlis', 'souq', 'night', 'kitchen'];
    expect(readFileSync('src/features/challenges/games/AttentionSceneGame.tsx', 'utf8').match(/id: '(oasis|majlis|souq|night|kitchen)'/g)).toHaveLength(scenes.length);
    const kinds = new Set<string>();
    for (let i = 1; i < 80; i++) {
      // A small made-up scene: one object without a colour, and one extra that can appear.
      const r = makeRound({ id: 'x', bg: null, objects: [
        { id: 'a', x: 50, y: 50, w: 20, h: 20, color: '#FFD36E', draw: () => null },
        { id: 'b', x: 120, y: 60, w: 20, h: 20, color: '#8BCDF1', draw: () => null },
        { id: 'c', x: 200, y: 120, w: 20, h: 20, color: '', draw: () => null },
        { id: 'd', x: 260, y: 150, w: 20, h: 20, color: '#28785B', draw: () => null },
        { id: 'e', x: 300, y: 40, w: 20, h: 20, color: '#A78BFA', draw: () => null },
      ], extras: [{ id: 'z', x: 160, y: 160, w: 20, h: 20, color: '#FFFFFF', draw: () => null }] }, 4, seeded(i));
      expect(r.changes.size + (r.added ? 1 : 0)).toBe(4);
      r.changes.forEach((c) => kinds.add(c.kind));
      if (r.added) kinds.add('add');
      expect(r.changes.get('c')?.kind).not.toBe('color');
    }
    expect([...kinds].sort()).toEqual(['add', 'color', 'gone', 'move']);
  });

  it('adapts from 2 to 4 differences', () => {
    expect(diffCount(true, 100)).toBe(2);
    expect(diffCount(false, null)).toBe(3);
    expect(diffCount(false, 95)).toBe(4);
    expect(diffCount(false, 40)).toBe(2);
  });
});

describe('"What do you remember?"', () => {
  it('uses everyday Saudi things, enough for the biggest round', () => {
    expect(Object.keys(MEM_ITEMS)).toEqual(expect.arrayContaining(['dallah', 'finjan', 'date', 'lantern', 'palm', 'camel']));
    expect(Object.keys(MEM_ITEMS).length).toBeGreaterThanOrEqual(8);
  });
});

describe('come back later', () => {
  const now = new Date(2026, 10, 10, 14, 30);
  it('works out the times', () => {
    expect(laterTime('hour', now)).toBe(now.getTime() + 3600e3);
    expect(new Date(laterTime('tonight', now)).getHours()).toBe(21);
    expect(new Date(laterTime('tomorrow', now)).getDate()).toBe(11);
    expect(new Date(atClock('09:00', now)!).getDate()).toBe(11);
    expect(new Date(atClock('18:15', now)!).getDate()).toBe(10);
    expect(atClock('25:00', now)).toBeNull();
  });

  it('shows only what is due, and survives a reload', () => {
    const s = fresh();
    addLater(s, ['Call the bank'], now.getTime() - 1);
    addLater(s, ['Gym'], now.getTime() + 3600e3);
    expect(dueLater(s, now.getTime()).map((x) => x.text)).toEqual(['Call the bank']);
    expect(hydrate({ ...s, later: [...s.later, { id: 1, text: 'bad' }] } as unknown as AppState).later).toHaveLength(2);
  });
});
