import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TAB_OF } from '../src/components/navigation/NavBar';
import { CHALLENGES, GROUPS } from '../src/features/challenges/catalog';
import { buildPlan, currentNode, ensureAhead, freshenCurrent, replaceRetired, swapCurrent, SWAPS } from '../src/features/path/planner';
import { emptyProfile, type LifeProfile } from '../src/features/profile/questions';
import { defaultState } from '../src/services/storage';
import type { AppState } from '../src/types';

const read = (p: string) => readFileSync(p, 'utf8');
const json = (p: string) => JSON.parse(read(p));
const prof = (p: Partial<LifeProfile> = {}): LifeProfile => ({ ...emptyProfile(), goals: ['stress'], ...p } as LifeProfile);
const withPlan = (p = prof()): AppState => ({ ...defaultState(), prof: p, path: buildPlan(p, 1000) });

describe('My journey is the tab', () => {
  it('replaces "My challenges" in the bar, and the library and old journeys light it', () => {
    const nav = read('src/components/navigation/NavBar.tsx');
    expect(nav).toMatch(/\['path', MapIcon\]/);
    expect(nav).not.toMatch(/\['chal', /);
    expect(TAB_OF.chal).toBe('path');
    expect(TAB_OF.journeys).toBe('path');
    for (const l of ['ar-SA', 'en']) expect(json(`src/i18n/locales/${l}/nav.json`).myJourney).toBeTruthy();
  });

  it('has a way to anything specific and to dhikr', () => {
    const page = read('src/pages/Path/index.tsx');
    expect(page).toMatch(/openChallenges\(onNavigate\)/);
    expect(page).toMatch(/onNavigate\('dhikr'\)/);
  });

  it('no longer offers the 7-day journeys, in the library or in Settings', () => {
    expect(read('src/pages/Challenges/index.tsx')).not.toMatch(/ProgramCard/);
    expect(read('src/pages/Settings/index.tsx')).not.toMatch(/onNavigate\('journeys'\)/);
  });

  it('is only the map: the buttons sit on it, and it stops partway into the next chapter, behind a blur', () => {
    const page = read('src/pages/Path/index.tsx');
    expect(page).not.toMatch(/TodayCard|jm__foot/);
    expect(page).toMatch(/className="jw__more"/);
    expect(page).toMatch(/className="jw-veil"/);
    expect(page).toMatch(/if \(st\.y > cutY\) return null;/);
  });
});

describe('a step is chosen as it is reached', () => {
  it('can be swapped for another fitting challenge, at most twice, and never for one already on the journey', () => {
    const s = withPlan();
    const first = currentNode(s.path)!.id;
    const ids = new Set(s.path!.nodes.filter((n) => n.id).map((n) => n.id));
    const to = swapCurrent(s, 2000);
    expect(to).not.toBeNull();
    expect(to).not.toBe(first);
    expect(ids.has(to!)).toBe(false);
    expect(CHALLENGES[to!].retired).toBeFalsy();
    for (let i = 1; i < SWAPS; i++) swapCurrent(s, 3000 + i);
    expect(swapCurrent(s, 9000)).toBeNull();
    expect(currentNode(s.path)!.sw).toBe(SWAPS);
  });

  it('replaces a step the user said twice didn\'t suit them, when they reach it', () => {
    const s = withPlan();
    const id = currentNode(s.path)!.id!;
    s.fb = [{ id, v: -1, ts: 1 }, { id, v: -1, ts: 2 }];
    expect(freshenCurrent(s, 5000)).toBe(true);
    expect(currentNode(s.path)!.id).not.toBe(id);
    // Done steps are never touched.
    expect(s.path!.nodes.every((n) => !n.done)).toBe(true);
  });
});

describe('a journey saved before a challenge was retired', () => {
  it('gets a fitting active challenge for every retired step not done yet, and keeps done ones', () => {
    const s = withPlan();
    const [a, b] = s.path!.nodes.filter((n) => n.kind === 'play');
    a.id = 'start2';
    a.done = { at: 1, xp: 25 };
    b.id = 'start2';
    expect(replaceRetired(s, 7000)).toBe(true);
    expect(a.id).toBe('start2');
    expect(CHALLENGES[b.id!].retired).toBeFalsy();
    expect(replaceRetired(s, 8000)).toBe(false);
  });
});

describe('the journey never ends', () => {
  it('always keeps one locked chapter ahead, so the journey never ends', () => {
    const s = withPlan();
    const last = () => Math.max(...s.path!.nodes.map((n) => n.ch));
    // Still in the first chapter, with a second one ahead: nothing to add.
    expect(ensureAhead(s, s.prof)).toBe(false);
    // Reaching the last chapter adds the next one straight away.
    for (let cur = currentNode(s.path); cur && cur.ch < last(); cur = currentNode(s.path)) cur.done = { at: 1, xp: 0 };
    const before = last();
    expect(ensureAhead(s, s.prof)).toBe(true);
    expect(last()).toBe(before + 1);
    expect(currentNode(s.path)!.ch).toBeLessThan(last());
  });

});

describe('one tap to play', () => {
  it('the intro button and a step on the map open the game itself', () => {
    const player = read('src/features/mission/MissionPlayer.tsx');
    expect(player).toMatch(/onStart=\{\(\) => run\(true\)\}/);
    expect(player).toMatch(/start === 'play'/);
    expect(read('src/pages/Path/index.tsx')).toMatch(/\{ direct: true \}/);
  });

  it('every challenge in the library has three how-to-play steps in both languages', () => {
    for (const l of ['ar-SA', 'en']) {
      const items = json(`src/i18n/locales/${l}/challenges.json`).items;
      for (const id of GROUPS.flatMap((g) => g.ids)) for (const n of ['1', '2', '3']) expect(items[id].how?.[n], `${l} ${id}.how.${n}`).toBeTruthy();
    }
  });
});

describe('the challenge library', () => {
  it('has Zaho talking on top and shows challenges as pictures, not text cards', () => {
    const page = read('src/pages/Challenges/index.tsx');
    expect(page).toMatch(/<Mascot state=\{mascot\.state\}/);
    expect(page).toMatch(/challenges\.say\.\$\{group\}/);
    expect(page).not.toMatch(/<ChallengeCard/);
    for (const l of ['ar-SA', 'en']) {
      const say = json(`src/i18n/locales/${l}/challenges.json`).say;
      for (const g of ['all', ...GROUPS.map((x) => x.id)]) expect(say[g], `${l} ${g}`).toBeTruthy();
    }
  });
});
