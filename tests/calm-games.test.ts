import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GROUPS, JOURNEYS } from '../src/features/challenges/catalog';
import { buildPlan } from '../src/features/path/planner';
import { emptyProfile, type LifeProfile } from '../src/features/profile/questions';

// The eye break and noticing the senses (Razan's games) are wired into the rest of the app.
describe('the eye break and noticing the senses, around the app', () => {
  it('are in the calm group and at the end of their journeys, so journeys under way keep their days', () => {
    expect(GROUPS.find((g) => g.id === 'calm')!.ids).toEqual(expect.arrayContaining(['eye_break', 'grounding']));
    expect(JOURNEYS.find((j) => j.id === 'anx')!.a.at(-1)).toBe('grounding');
    expect(JOURNEYS.find((j) => j.id === 'gen')!.a.at(-1)).toBe('eye_break');
    expect(JOURNEYS.find((j) => j.id === 'adhd')!.a).toContain('eye_break');
  });

  it('can come up on the map for stress', () => {
    const plan = buildPlan({ ...emptyProfile(), goals: ['stress'] } as LifeProfile);
    expect(plan.nodes.map((n) => n.id)).toContain('grounding');
  });

  it('the break opens the eye break for "rest my eyes", and Zaho knows when to offer both', () => {
    expect(readFileSync('src/features/challenges/games/CalmLandscapeGame.tsx', 'utf8')).toMatch(/need === 'eyes'\) return <EyeBreakGame/);
    const prompt = readFileSync('server/prompt.ts', 'utf8');
    expect(prompt).toMatch(/→ grounding or calm/);
    expect(prompt).toMatch(/tired eyes → eye_break/);
  });
});
