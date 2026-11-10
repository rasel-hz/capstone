import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHALLENGES, GROUPS, JOURNEYS } from '../src/features/challenges/catalog';
import { GAMES } from '../src/features/challenges/games';
import { CHALLENGE_META } from '../src/features/recommend/goals';

const NEW = ['eye_rest', 'grounding'] as const;
const json = (l: string, f: string) => JSON.parse(readFileSync(`src/i18n/locales/${l}/${f}.json`, 'utf8'));

describe('"Rest your eyes" and "What\'s around you?"', () => {
  it('are in the catalog, the calm group and the game list, and earn points', () => {
    NEW.forEach((id) => {
      expect(CHALLENGES[id]).toBeDefined();
      expect(CHALLENGES[id].selfReport).toBeUndefined();
      expect(GROUPS.find((g) => g.id === 'calm')!.ids).toContain(id);
      expect(GAMES[id]).toBeDefined();
      expect(CHALLENGE_META[id].gentle).toBe(true);
    });
    expect(JOURNEYS.find((j) => j.id === 'anx')!.a).toContain('grounding');
    expect(JOURNEYS.find((j) => j.id === 'adhd')!.a).toContain('eye_rest');
  });

  it('have every text in both languages, with no medical claims', () => {
    for (const l of ['ar-SA', 'en']) {
      const items = json(l, 'challenges').items;
      const games = json(l, 'games');
      NEW.forEach((id) => {
        ['name', 'desc', 'purpose', 'instructions'].forEach((f) => expect(items[id][f], `${l} ${id}.${f}`).toBeTruthy());
        const all = JSON.stringify([items[id], games[id]]);
        expect(all, `${l} ${id}`).not.toMatch(/يعالج|علاج|يشفي|treat|cure|heal/i);
      });
    }
  });

  it('take no typed text, and the break uses the eye rest', () => {
    for (const f of ['EyeRestGame', 'GroundingGame']) expect(readFileSync(`src/features/challenges/games/${f}.tsx`, 'utf8'), f).not.toMatch(/<input/);
    expect(readFileSync('src/features/challenges/games/CalmLandscapeGame.tsx', 'utf8')).toMatch(/need === 'eyes'\) return <EyeRestGame/);
  });
});
