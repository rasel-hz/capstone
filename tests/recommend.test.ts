import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../src/features/challenges/catalog';
import { recommend } from '../src/features/recommend/engine';
import { defaultState } from '../src/services/storage';
import type { AppState, ChallengeId } from '../src/types';

const state = (p: Partial<AppState> = {}): AppState => ({ ...defaultState(), ...p });
const ids = (r: { id: ChallengeId }[]) => r.map((x) => x.id);

describe('recommendation engine', () => {
  it('puts the prioritising board first for an overwhelmed user', () => {
    const r = recommend(state(), { goals: ['prioritize'] });
    expect(r[0].id).toBe('priority_board');
    expect(r[0].why[0]).toEqual({ k: 'goal_prioritize' });
  });

  it('only returns challenges that support the goal', () => {
    const r = recommend(state(), { goals: ['start'] });
    expect(ids(r).sort()).toEqual(['breakdown', 'micro_start', 'start2', 'study_sprint'].sort());
  });

  it('never suggests anything longer than the time the user has', () => {
    const r = recommend(state(), { goals: ['focus', 'start'], minutes: 2 });
    expect(r.length).toBeGreaterThan(0);
    r.forEach((x) => expect(CHALLENGES[x.id].min).toBeLessThanOrEqual(2));
    expect(r[0].why).toContainEqual({ k: 'fits', n: 2 });
  });

  it('keeps longer, demanding challenges out on a low-energy day', () => {
    const r = recommend(state(), { goals: ['start'], low: true });
    expect(ids(r)).not.toContain('study_sprint');
    expect(ids(r)).not.toContain('breakdown');
    expect(r[0].id).toBe('start2');
    expect(r[0].why).toContainEqual({ k: 'gentle' });
  });

  it('offers a break, not more work, when the user wants rest', () => {
    const r = recommend(state(), { goals: ['rest'], low: true });
    expect(r[0].id).toBe('calm_landscape');
  });

  it('offers the feelings map only when worry is the main goal', () => {
    expect(ids(recommend(state(), { goals: ['stress'] }))).not.toContain('emotion_map');
    expect(ids(recommend(state(), { goals: ['worry'] }))).toContain('emotion_map');
    expect(ids(recommend(state()))).not.toContain('emotion_map');
  });

  it('ignores IDs that are not in the catalog', () => {
    const r = recommend(state(), { prefer: ['made_up_game' as ChallengeId, 'calm'] });
    expect(ids(r)).not.toContain('made_up_game');
    expect(r[0].id).toBe('calm');
  });

  it('ranks what the user found helpful higher, and drops what they twice found unhelpful', () => {
    const fb = [
      { id: 'breakdown' as const, v: -1 as const, ts: 1 },
      { id: 'breakdown' as const, v: -1 as const, ts: 2 },
      { id: 'start2' as const, v: 1 as const, ts: 3 },
    ];
    const r = recommend(state({ fb }), { goals: ['start'] });
    expect(ids(r)).not.toContain('breakdown');
    expect(r[0].id).toBe('start2');
    expect(r[0].why).toContainEqual({ k: 'helped' });
  });

  it('still drops a twice-unhelpful challenge when the AI suggests it, unless the user asked by name', () => {
    const fb = [{ id: 'mem' as const, v: -1 as const, ts: 1 }, { id: 'mem' as const, v: -1 as const, ts: 2 }];
    expect(ids(recommend(state({ fb }), { goals: ['memory'] }))).not.toContain('mem');
    expect(ids(recommend(state({ fb }), { prefer: ['mem'] }))).toContain('mem');
  });

  it('prefers variety over repeating what was finished today', () => {
    const now = Date.now();
    const hist = [{ mid: 'm', id: 'video' as const, status: 'COMPLETED' as const, acc: 90, retries: 0, xp: 30, dur: 60, d: '', ts: now - 1000 }];
    const r = recommend(state({ hist }), { goals: ['focus'], now });
    expect(r[0].id).not.toBe('video');
  });

  it('suggests the easier version after a low score', () => {
    const hist = [{ mid: 'm', id: 'mem' as const, status: 'COMPLETED' as const, acc: 40, retries: 1, xp: 12, dur: 60, d: '', ts: 1 }];
    expect(recommend(state({ hist }), { goals: ['memory'] })[0]).toMatchObject({ id: 'mem', diff: 'easy' });
  });
});
