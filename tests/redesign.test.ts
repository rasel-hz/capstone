import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHALLENGES, JOURNEYS } from '../src/features/challenges/catalog';
import { makeRound } from '../src/features/challenges/games/MemoryGame';
import { challengeStatus } from '../src/features/challenges/ChallengeCard';
import { buildChatRequest } from '../src/features/companion/request';
import { beginItem, completeItem, createMission, skipItem } from '../src/features/mission/engine';
import { generateMission, missionReason, whyText } from '../src/features/mission/planner';
import { achievements } from '../src/features/rewards/achievements';
import { defaultState, hydrate } from '../src/services/storage';
import type { AppState, Attempt, ChallengeId } from '../src/types';
import { today } from '../src/utils';
import { withoutEmoji } from '../src/services/points';

const fresh = (o: Partial<AppState> = {}) => ({ ...defaultState(), ...o });
const attempt = (id: ChallengeId, o: Partial<Attempt> = {}): Attempt => ({ mid: 'm', id, status: 'COMPLETED', acc: null, retries: 0, xp: 0, dur: 30, d: today(), ts: Date.now(), ...o });

describe('catalog', () => {
  it('keeps the six original challenges and their XP', () => {
    const base = { video: 30, mem: 25, seq: 25, time: 20, calm: 15, start2: 25 } as const;
    (Object.keys(base) as (keyof typeof base)[]).forEach((id) => expect(CHALLENGES[id].xp).toBe(base[id]));
  });

  it('only maps journeys to challenges that exist, and keeps all eight', () => {
    expect(JOURNEYS.map((j) => j.id).sort()).toEqual(['adhd', 'anx', 'aut', 'gen', 'mood', 'ocd', 'sleep', 'soc']);
    JOURNEYS.forEach((j) => j.a.forEach((a) => expect(CHALLENGES[a]).toBeDefined()));
  });

  it('adds nothing beyond the reviewed activities to the OCD journey', () => {
    expect(JOURNEYS.find((j) => j.id === 'ocd')!.a).toEqual(['calm', 'time']);
  });
});

describe('challenge status', () => {
  it('never shows a score for a challenge that was not finished', () => {
    const s = fresh({ hist: [attempt('mem', { status: 'SKIPPED', acc: 100 })] });
    expect(challengeStatus(s, 'mem')).toEqual({ text: 'ما جربته للحين', tried: false });
  });

  it('shows the real last accuracy', () => {
    const s = fresh({ hist: [attempt('mem', { acc: 50 }), attempt('mem', { acc: 75 })] });
    expect(challengeStatus(s, 'mem').text).toContain('75%');
  });
});

describe('self-report stays unrewarded and private', () => {
  it('gives emotion_map no XP', () => {
    const s = fresh();
    createMission(s, [{ id: 'emotion_map', why: '', diff: 'normal' }], true);
    beginItem(s);
    expect(completeItem(s, { acc: null, retries: 0, data: { feelings: ['tense'] } })?.xp).toBe(0);
    expect(s.xp).toBe(0);
  });

  it('does not count emotion_map toward achievements', () => {
    const s = fresh({ hist: [attempt('emotion_map')] });
    expect(achievements(s).find((a) => a.art === 'step')!.earned).toBe(false);
  });

  it('never sends feelings or typed text to the chat service', () => {
    const s = fresh({ name: 'سارة', hist: [attempt('emotion_map', { data: { feelings: ['upset'] } }), attempt('start2', { data: { task: 'مهمة سرية', step: 'خطوة' } })] });
    const sent = JSON.stringify(buildChatRequest('هلا', s));
    expect(sent).not.toContain('emotion_map');
    expect(sent).not.toContain('upset');
    expect(sent).not.toContain('مهمة سرية');
    expect(sent).not.toContain('سارة');
  });
});

describe('mission explanations', () => {
  it('gives each step its own reason', () => {
    const why = generateMission(fresh()).map((m) => whyText(m.why));
    expect(new Set(why).size).toBe(why.length);
  });

  it('only mentions context the user gave', () => {
    expect(missionReason(fresh())).not.toContain('مناسبت');
    expect(missionReason(fresh({ ctx: ['event'] }))).toContain('مناسبت');
  });

  it('names a chosen journey only if the user chose it', () => {
    const mine = generateMission(fresh({ needs: ['adhd'] }));
    expect(mine.some((m) => whyText(m.why).includes('التركيز والتنظيم'))).toBe(true);
    expect(generateMission(fresh({ needs: [] })).some((m) => whyText(m.why).includes('التركيز والتنظيم'))).toBe(false);
  });
});

describe('memory rounds', () => {
  it('always has the missing object among the options, with decoys that were not on the tray', () => {
    for (let i = 0; i < 200; i++) {
      const n = 4 + (i % 3);
      const r = makeRound(n);
      const m = r.items[r.miss];
      expect(r.items).toHaveLength(n);
      expect(r.options.filter((o) => o.k === m.k && o.c === m.c)).toHaveLength(1);
      expect(r.options.length).toBeGreaterThanOrEqual(3);
      const others = r.items.filter((_, x) => x !== r.miss);
      // A decoy that is still visible on the tray would be an obvious wrong answer, not a memory test.
      r.options.filter((o) => !(o.k === m.k && o.c === m.c)).forEach((o) => {
        expect(others.some((x) => x.k === o.k && x.c === o.c)).toBe(false);
      });
      expect(new Set(r.options.map((o) => `${o.k}${o.c}`)).size).toBe(r.options.length);
    }
  });
});

describe('saved data', () => {
  it('fills new fields without resetting old progress', () => {
    const s = hydrate({ xp: 240, name: 'نورة', hist: [attempt('mem')] });
    expect(s.xp).toBe(240);
    expect(s.name).toBe('نورة');
    expect(s.largeText).toBe(0);
  });

  it('drops a prayer time entered on an earlier day', () => {
    expect(hydrate({ prayer: '12:00', prayerDay: 'Mon Jan 01 2001' }).prayer).toBe('');
    expect(hydrate({ prayer: '12:00', prayerDay: today() }).prayer).toBe('12:00');
  });
});

describe('skipping', () => {
  it('earns nothing for a new challenge too', () => {
    const s = fresh();
    createMission(s, [{ id: 'study_sprint', why: '', diff: 'normal' }], true);
    beginItem(s);
    skipItem(s);
    expect(s.xp).toBe(0);
    expect(s.hist[0].status).toBe('SKIPPED');
  });
});

describe('mascot clips', () => {
  it('has a file for every state, and every reaction has a length', async () => {
    const { CLIPS, ONE_SHOT_MS } = await import('../src/components/mascot/manifest');
    const states = ['idle', 'greeting', 'listening', 'thinking', 'happy', 'celebrating', 'encouraging', 'curious', 'calm', 'resting', 'concerned'] as const;
    states.forEach((st) => {
      expect(CLIPS[st]?.src, st).toContain(`${st}.webm`);
      expect(statSync(`public/mascot/animations/${st}.webm`).size, st).toBeGreaterThan(0);
    });
    Object.values(ONE_SHOT_MS).forEach((ms) => expect(ms).toBe(3040));
  });
});

describe('interface text', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

  it('contains no emoji or pictographic symbols', () => {
    const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
    const hits = walk('src').filter((f) => /\.(tsx?|css|json)$/.test(f)).filter((f) => emoji.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('removes emoji from reward text that comes from the database', () => {
    expect(withoutEmoji('A coffee from Dunkin \u2615')).toBe('A coffee from Dunkin');
    expect(withoutEmoji('Get your reward \u{1F39F}\uFE0F')).toBe('Get your reward');
    expect(withoutEmoji('No emoji here')).toBe('No emoji here');
  });
});
