import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REPLY_SCHEMA } from '../server/prompt';
import { CHALLENGES, JOURNEYS } from '../src/features/challenges/catalog';
import { GAMES } from '../src/features/challenges/games';
import { LADDER } from '../src/features/challenges/games/MicroStartGame';
import { completeItem, createMission, finishMission } from '../src/features/mission/engine';
import { clearTypedText, typedCount } from '../src/features/plan/privacy';
import { buildChatRequest } from '../src/features/companion/request';
import { recommend } from '../src/features/recommend/engine';
import { CHALLENGE_META } from '../src/features/recommend/goals';
import { buildSuggestion } from '../src/features/recommend/suggest';
import { defaultState } from '../src/services/storage';

const locale = (lang: string, area: string) => JSON.parse(readFileSync(`src/i18n/locales/${lang}/${area}.json`, 'utf8'));
const NEW = ['micro_start', 'thought_sort'] as const;

describe('new activities are fully registered', () => {
  it.each(NEW)('%s has a game, goals, a catalog entry and the AI can name it', (id) => {
    expect(GAMES[id]).toBeTypeOf('function');
    expect(CHALLENGES[id]).toBeDefined();
    expect(CHALLENGE_META[id].goals.length).toBeGreaterThan(0);
    expect(REPLY_SCHEMA.properties.suggest.properties.challenge_ids.items.enum).toContain(id);
    expect(JOURNEYS.some((j) => (j.a as string[]).includes(id))).toBe(true);
  });

  it.each(NEW)('%s has its name, purpose and instructions in both languages', (id) => {
    for (const lang of ['en', 'ar-SA']) {
      const item = locale(lang, 'challenges').items[id];
      for (const k of ['name', 'desc', 'purpose', 'instructions']) expect(item[k]).toBeTruthy();
    }
  });

  it('every step of the shrink ladder has text in both languages', () => {
    for (const lang of ['en', 'ar-SA']) LADDER.forEach((k) => expect(locale(lang, 'games').micro.ladder[k]).toBeTruthy());
  });

  it('catalog keys stay unique', () => {
    const keys = Object.values(CHALLENGES).map((c) => c.k);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('when they are suggested', () => {
  it('offers "just the first step" when getting started is hard', () => {
    expect(recommend(defaultState(), { goals: ['start'] }).map((r) => r.id)).toContain('micro_start');
  });

  it('offers "let\'s think it through" for worries, but never on a request for rest', () => {
    expect(recommend(defaultState(), { goals: ['worry'] })[0].id).toBe('thought_sort');
    expect(recommend(defaultState(), { goals: ['rest'], low: true }).map((r) => r.id)).not.toContain('thought_sort');
  });

  it('passes the tasks the user named to "just the first step"', () => {
    const sug = buildSuggestion(defaultState(), { goals: ['start'], prefer: ['micro_start'], tasks: ['Udacity AI course'] });
    expect(sug?.ids[0]).toBe('micro_start');
    expect(sug?.cfg?.tasks.map((t) => t.text)).toContain('Udacity AI course');
  });
});

describe('results and privacy', () => {
  it('earns XP once, with no score, and keeps what was typed on the device', () => {
    const s = defaultState();
    createMission(s, [{ id: 'thought_sort', why: [{ k: 'chat' }], diff: 'normal' }], true);
    const data = { concerns: ['Money this month', 'A deadline'], act: ['A deadline'], unsure: ['Money this month'], later: [], next: { concern: 'A deadline', step: 'Email my manager' } };
    expect(completeItem(s, { acc: null, retries: 0, data })?.xp).toBe(15);
    expect(completeItem(s, { acc: null, retries: 0, data })).toBeNull();
    expect(s.hist[0].acc).toBeNull();
    expect(finishMission(s).xp).toBe(15);
    // Only the count goes to the AI, never the concerns.
    expect(JSON.stringify(buildChatRequest('hi', s))).not.toMatch(/deadline|Money|manager/i);
  });

  it('deleting typed text removes concerns, next steps and first steps', () => {
    const s = defaultState();
    createMission(s, [{ id: 'thought_sort', why: [{ k: 'chat' }], diff: 'normal' }, { id: 'micro_start', why: [{ k: 'chat' }], diff: 'normal' }], true);
    completeItem(s, { acc: null, retries: 0, data: { concerns: ['Money'], act: [], unsure: ['Money'], later: [], next: null } });
    s.mission!.idx = 1;
    completeItem(s, { acc: null, retries: 0, data: { task: 'Udacity', step: 'Just open it', outcome: 'started', mode: 60 } });
    expect(typedCount(s)).toBe(2);
    clearTypedText(s);
    expect(JSON.stringify(s.hist)).not.toMatch(/Money|Udacity|open it/);
    expect(s.hist.map((h) => h.status)).toEqual(['COMPLETED', 'COMPLETED']);
  });
});
