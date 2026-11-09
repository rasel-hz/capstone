import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { completeItem, createMission, exitMission, hasOpenMission } from '../src/features/mission/engine';
import { buildPlan, currentNode, completeReflect, pathItem, replan, type PathPlan } from '../src/features/path/planner';
import { biomesFor, chapterProgress, layoutWorld, pendingArrival, routePoints, standKey, WORLD_W } from '../src/features/path/world';
import { emptyProfile, type LifeProfile } from '../src/features/profile/questions';
import { defaultState, hydrate } from '../src/services/storage';
import type { AppState } from '../src/types';

const prof = (p: Partial<LifeProfile>): LifeProfile => ({ ...emptyProfile(), at: 1, ...p });
const student = prof({ life: ['uni'], goals: ['organize', 'start'], primary: 'start' });
const worker = prof({ life: ['work'], goals: ['organize'] });
const state = (plan: PathPlan, p: Partial<AppState> = {}): AppState => ({ ...defaultState(), path: plan, ...p });

function play(s: AppState) {
  const n = currentNode(s.path)!;
  createMission(s, [pathItem(s, n)], true);
  return completeItem(s, { acc: null, retries: 0 });
}
const save = (s: AppState) => hydrate(JSON.parse(JSON.stringify(s)));

describe('world layout', () => {
  const plans = [buildPlan(student), buildPlan(worker), buildPlan(emptyProfile()), buildPlan(prof({ goals: ['stress'], style: ['talk'] }))];

  it('places every step inside the world, in order, with room between them', () => {
    for (const p of plans) {
      const w = layoutWorld(p);
      expect(w.stops).toHaveLength(p.nodes.length);
      w.stops.forEach((st, i) => {
        expect(st.x).toBeGreaterThanOrEqual(90);
        expect(st.x).toBeLessThanOrEqual(WORLD_W - 90);
        expect(st.y).toBeLessThan(w.height);
        if (i) expect(st.y - w.stops[i - 1].y).toBeGreaterThanOrEqual(170);
      });
    }
  });

  it('winds left, centre and right rather than running straight', () => {
    const xs = new Set(layoutWorld(plans[0]).stops.map((s) => s.x));
    expect(xs.size).toBeGreaterThanOrEqual(3);
  });

  it('is identical every time for the same journey', () => {
    expect(layoutWorld(plans[0])).toEqual(layoutWorld(buildPlan(student, 999)));
  });

  it('stays valid for any number of steps', () => {
    const base = plans[0];
    for (const n of [1, 2, 3, 7, base.nodes.length]) {
      const plan = { ...base, nodes: base.nodes.slice(0, n) };
      const w = layoutWorld(plan);
      expect(w.stops).toHaveLength(n);
      expect(w.segments).toHaveLength(n - 1);
      expect(Number.isFinite(w.height)).toBe(true);
    }
  });

  it('crosses between chapters on a bridge, and only there', () => {
    const w = layoutWorld(plans[0]);
    const chapters = new Set(w.stops.map((s) => s.ch)).size;
    expect(w.segments.filter((s) => s.bridge)).toHaveLength(chapters - 1);
  });

  it('keeps scenery off the steps, inside the world', () => {
    const w = layoutWorld(plans[0]);
    for (const c of w.chapters) for (const d of c.decor) {
      expect(d.x).toBeGreaterThan(0);
      expect(d.x).toBeLessThan(WORLD_W);
      for (const st of w.stops) expect(Math.hypot(d.x - st.x, d.y - st.y)).toBeGreaterThan(40);
    }
  });

  it('gives neighbouring chapters different looks, from their themes', () => {
    expect(biomesFor(['stress', 'sleep'], 2)).toEqual(['calm', 'hill']);
    expect(biomesFor(['study', 'stress'], 2)).toEqual(['garden', 'calm']);
    expect(biomesFor(['gentle'], 1)).toEqual(['welcome']);
  });

  it('draws the route Numo travels from stop to stop', () => {
    const [a, b] = layoutWorld(plans[0]).stops;
    const pts = routePoints(a, b);
    expect(pts[0]).toEqual({ x: a.x, y: a.y });
    expect(pts[pts.length - 1].x).toBeCloseTo(b.x);
    expect(pts[pts.length - 1].y).toBeCloseTo(b.y);
  });
});

describe('Test A: a new user', () => {
  it('stands Numo on the first step, with nothing to celebrate', () => {
    const plan = buildPlan(student);
    expect(standKey(plan)).toBe(plan.nodes[0].key);
    expect(pendingArrival(plan)).toBeNull();
    expect(chapterProgress(plan)).toMatchObject({ ch: 0, done: 0, total: plan.nodes.length });
  });
});

describe('Test B: finishing a level', () => {
  it('saves first, pays XP once, then has one celebration and one move', () => {
    const s = state(buildPlan(student));
    const first = currentNode(s.path)!;
    const second = s.path!.nodes[1];
    expect(play(s)?.xp).toBe(20);
    expect(first.key).toBe(s.path!.nodes[0].key);
    expect(s.path!.nodes[0].done).toBeDefined();
    expect(pendingArrival(s.path!)).toEqual({ from: first.key, to: second.key, milestone: false });
    expect(standKey(s.path!)).toBe(second.key);
    s.path!.seen = first.key;
    expect(pendingArrival(s.path!)).toBeNull();
    expect(s.xp).toBe(20);
  });
  it('marks a milestone as one, from real completion only', () => {
    const s = state(buildPlan(worker));
    while (currentNode(s.path)!.kind === 'play') play(s);
    completeReflect(s, currentNode(s.path)!.key);
    expect(pendingArrival(s.path!)?.milestone).toBe(true);
  });
});

describe('Test C: refresh and return', () => {
  it('restores the real step, with no repeated XP or celebration', () => {
    const s = state(buildPlan(student));
    play(s);
    s.path!.seen = s.path!.nodes[0].key;
    const back = save(s);
    expect(standKey(back.path!)).toBe(s.path!.nodes[1].key);
    expect(pendingArrival(back.path!)).toBeNull();
    expect(back.xp).toBe(20);
  });
  it('still celebrates after a refresh if it was never seen', () => {
    const s = state(buildPlan(student));
    play(s);
    expect(pendingArrival(save(s).path!)).not.toBeNull();
  });
});

describe('Test D: an interrupted challenge', () => {
  it('leaves the step current, unfinished and resumable', () => {
    const s = state(buildPlan(student));
    const n = currentNode(s.path)!;
    createMission(s, [pathItem(s, n)], true);
    exitMission(s);
    expect(hasOpenMission(s)).toBe(true);
    expect(s.mission!.items[0].jn).toBe(n.key);
    expect(currentNode(s.path)!.key).toBe(n.key);
    expect(n.done).toBeUndefined();
    expect(pendingArrival(s.path!)).toBeNull();
    expect(s.xp).toBe(0);
  });
});

describe('Test E: different users', () => {
  it('gives each their own steps and their own place', () => {
    const a = state(buildPlan(student));
    const b = state(buildPlan(worker));
    play(a);
    expect(a.path!.nodes.map((n) => n.id)).not.toEqual(b.path!.nodes.map((n) => n.id));
    expect(standKey(a.path!)).toBe(a.path!.nodes[1].key);
    expect(standKey(b.path!)).toBe(b.path!.nodes[0].key);
  });
});

describe('Revising a journey', () => {
  it('still lays out cleanly, with finished steps kept', () => {
    const s = state(buildPlan(student));
    play(s);
    const next = replan(s.path, worker);
    const w = layoutWorld(next);
    expect(w.stops).toHaveLength(next.nodes.length);
    expect(new Set(w.stops.map((x) => x.key)).size).toBe(w.stops.length);
    expect(standKey(next)).toBe(next.nodes[1].key);
  });
});

describe('journey styles', () => {
  it('do not reuse a landing page class name', () => {
    const classes = (f: string) => new Set(readFileSync(f, 'utf8').match(/\.[a-zA-Z][\w-]*/g));
    const landing = classes('src/styles/landing.css');
    expect([...classes('src/styles/journey.css')].filter((c) => landing.has(c))).toEqual([]);
  });
});
