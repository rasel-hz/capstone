import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { passwordLogin } from '../server/auth';
import { CHALLENGES, GROUPS } from '../src/features/challenges/catalog';
import { GAMES } from '../src/features/challenges/games';
import { EYE_SECONDS, secondsLeft } from '../src/features/challenges/games/EyeBreakGame';
import { groundingDone, STAGES } from '../src/features/challenges/games/GroundingGame';
import { fillName } from '../src/features/companion/name';
import { TAB_OF } from '../src/components/navigation/NavBar';
import { AuthError, login } from '../src/services/auth';
import { balanceOf } from '../src/services/points';

const read = (p: string) => readFileSync(p, 'utf8');
const json = (p: string) => JSON.parse(read(p));
const locales = ['ar-SA', 'en'];

describe('1. wrong username or password', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('says exactly that, and nothing about the connection', () => {
    expect(json('src/i18n/locales/ar-SA/auth.json').errors.invalidCredentials).toBe('اسم المستخدم أو كلمة المرور غير صحيحة. حاول مرة ثانية.');
  });

  it('maps the server answer to the credentials message, and a service failure to the connection message', async () => {
    const reply = (status: number, error: string) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error }), { status })));
    reply(401, 'invalid_credentials');
    await expect(login('someone', 'wrong-password')).rejects.toMatchObject({ code: 'invalidCredentials' });
    reply(503, 'auth_unreachable');
    await expect(login('someone', 'wrong-password')).rejects.toMatchObject({ code: 'network' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(login('someone', 'pw')).rejects.toBeInstanceOf(AuthError);
  });

  it('waits longer than the server, so a slow "wrong password" is not reported as a connection error', () => {
    expect(read('src/services/auth.ts')).toMatch(/AbortSignal\.timeout\(25000\)/);
    expect(read('server/auth.ts')).toMatch(/connect_timeout: 8/);
  });

  it('reports a failed username lookup as the service, never as wrong credentials', async () => {
    const deps = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon', findEmail: async () => { throw new Error('boom'); } };
    await expect(passwordLogin({ username: 'someone', password: 'whatever1' }, deps as never)).rejects.toThrow();
    const wrong = { ...deps, findEmail: async () => null };
    await expect(passwordLogin({ username: 'someone', password: 'whatever1' }, wrong as never)).rejects.toMatchObject({ code: 'invalid_credentials' });
  });
});

describe('2. completion screen', () => {
  const player = read('src/features/mission/MissionPlayer.tsx');
  it('no longer shows "what actually happened" or its streak card', () => {
    expect(player).not.toContain('player.done.whatHappened');
    expect(player).not.toContain('<StreakDone');
    for (const l of locales) expect(json(`src/i18n/locales/${l}/player.json`).done.whatHappened).toBeUndefined();
  });
  it('keeps the rest of the summary', () => {
    for (const k of ['player.done.ofTotal', '<MissionTimeline', 'summaryLines(summary)', 'player.done.tomorrow']) expect(player).toContain(k);
  });
  it('keeps the streak calculation', () => {
    expect(read('src/features/streak/streak.ts')).toContain('export function streakOf');
  });
});

describe('3. my eyes are tired', () => {
  it('is a registered challenge in the calm group', () => {
    expect(CHALLENGES.eye_break).toBeDefined();
    expect(GAMES.eye_break).toBeDefined();
    expect(GROUPS.find((g) => g.id === 'calm')?.ids).toContain('eye_break');
    expect(CHALLENGES.eye_break.selfReport).toBeFalsy();
  });
  it('counts 20 seconds of running time', () => {
    expect(EYE_SECONDS).toBe(20);
    expect(secondsLeft(0)).toBe(20);
    expect(secondsLeft(500)).toBe(20);
    expect(secondsLeft(10_000)).toBe(10);
    expect(secondsLeft(19_100)).toBe(1);
    expect(secondsLeft(25_000)).toBe(0);
  });
  it('asks for no camera, notification or schedule', () => {
    const src = read('src/features/challenges/games/EyeBreakGame.tsx');
    expect(src).not.toMatch(/getUserMedia|Notification|setInterval\([^)]*1200000|serviceWorker/);
  });
});

describe('4. my mind is busy', () => {
  it('uses exactly 5, 3, 3, 2, 1 for sight, hearing, touch, smell and taste', () => {
    expect(STAGES.map((s) => [s.id, s.n])).toEqual([['see', 5], ['hear', 3], ['touch', 3], ['smell', 2], ['taste', 1]]);
  });
  it('can skip any sense, but skipping everything is not a completion', () => {
    const all = (skipped: boolean, count = 0) => STAGES.map((s) => ({ id: s.id, count, skipped }));
    expect(groundingDone(all(true))).toBe(false);
    expect(groundingDone(all(false))).toBe(false);
    expect(groundingDone([{ id: 'see', count: 5, skipped: false }, ...all(true).slice(1)])).toBe(true);
    expect(groundingDone([{ id: 'see', count: 4, skipped: false }, ...all(true).slice(1)])).toBe(false);
  });
  it('is registered, with text in both languages', () => {
    expect(GAMES.grounding).toBeDefined();
    for (const l of locales) {
      const g = json(`src/i18n/locales/${l}/games.json`).ground;
      for (const s of STAGES) expect(g.stages[s.id].title).toContain(String(s.n === 2 && l === 'ar-SA' ? '' : s.n === 1 && l === 'ar-SA' ? '' : s.n));
    }
  });
});

describe('5. redeeming rewards (the redemption system on main)', () => {
  it('spends from the balance the server reports', () => {
    expect(balanceOf({ lifetime: 500, today: 0, unlocks: [], balance: 300 } as never)).toBe(300);
  });
  it('checks and deducts in the database, under a per-user lock, never below zero', () => {
    const sql = read('supabase/migrations/20261110090000_reward_redemptions.sql');
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/if bal < cost then raise exception 'not_enough_points'/);
  });
  it('asks before deducting, blocks a second tap while working, and reopens used rewards without charging', () => {
    const page = read('src/pages/Rewards/index.tsx');
    expect(page).toContain("setStep('confirm')");
    expect(page).toContain("disabled={step === 'busy'}");
    expect(page).toContain("t('rewards.my.reopen')");
    for (const l of locales) expect(json(`src/i18n/locales/${l}/rewards.json`).my.reopen).toBeTruthy();
  });
  it('keeps only one redemption migration', () => {
    expect(() => read('supabase/migrations/20261109180000_reward_redemptions.sql')).toThrow();
  });
});

describe('6. disclaimers', () => {
  it('are gone from the chat, completion, challenges, journeys and progress screens', () => {
    expect(read('src/pages/Companion/index.tsx')).not.toContain('companion.disclaimer');
    expect(read('src/features/mission/MissionPlayer.tsx')).not.toContain('player.done.disclaimer');
    expect(read('src/pages/Progress/index.tsx')).not.toContain('progress.disclaimer');
    expect(read('src/pages/Journeys/index.tsx')).not.toContain('journeys.disclaimerDetail');
    for (const l of locales) {
      expect(json(`src/i18n/locales/${l}/companion.json`).disclaimer).toBeUndefined();
      expect(json(`src/i18n/locales/${l}/progress.json`).disclaimer).toBeUndefined();
      expect(json(`src/i18n/locales/${l}/challenges.json`).sub).not.toMatch(/health|صحتك/);
    }
  });
  it('keeps the crisis safety replies', () => {
    expect(json('src/i18n/locales/ar-SA/companion.json').crisis.support.length).toBeGreaterThan(20);
  });
});

describe('7 and 8. chat page', () => {
  const css = read('src/styles/components.css');
  it('uses nearly the whole screen', () => {
    // Main's full-screen chat: edge to edge on phones, wide on desktop.
    expect(css).toMatch(/\.chatp \{ margin: calc\(-16px - var\(--sat\)\) -16px 0;/);
    expect(css).not.toContain('page--chat');
    expect(read('index.html')).toContain('interactive-widget=resizes-content');
  });
  it('shows Zaho behind the messages without taking taps, and still with reduced motion', () => {
    expect(read('src/pages/Companion/index.tsx')).toMatch(/<div className="chat-bg" aria-hidden="true"><Mascot/);
    expect(css).toMatch(/\.chat-bg \{[^}]*pointer-events: none/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.chat-bg \{ animation: none/);
    expect(css).toContain('.rm .chat-bg { animation: none; }');
  });
});

describe('9. calling the user by name', () => {
  it('fills the {name} placeholder on the device, or drops the address when there is no name', () => {
    expect(fillName('\u064a\u0627 {name}\u060c \u0647\u0644\u0627', 'Razan')).toBe(`\u064a\u0627 ${'\u2068'}Razan${'\u2069'}\u060c \u0647\u0644\u0627`);
    expect(fillName('\u064a\u0627 {name}\u060c \u0647\u0644\u0627', '')).toBe('\u0647\u0644\u0627');
    expect(fillName('No placeholder here', 'Razan')).toBe('No placeholder here');
  });
  it('never uses the old generic address in the app texts or the model instructions', () => {
    const old = '\u064a\u0627 \u0628\u0639\u062f\u064a';
    for (const f of ['companion', 'dashboard']) expect(read(`src/i18n/locales/ar-SA/${f}.json`)).not.toContain(old);
    expect(read('server/prompt.ts')).toMatch(/Never write .*\{name\}/s);
    expect(read('server/chat.ts')).toContain("'\u064a\u0627 {name}'".replace(/\\u([0-9a-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  });
  it('never sends the name to the model', () => {
    expect(read('src/features/companion/request.ts')).not.toMatch(/\bname: s\.name|firstName/);
  });
});

describe('10. Achievements', () => {
  const nav = read('src/components/navigation/NavBar.tsx');
  it('is one tab in the main navigation, with Progress and Rewards as tabs inside it', () => {
    expect(nav).not.toMatch(/\['rew', /);
    expect(nav).toContain("prog: 'nav.achievements'");
    expect(TAB_OF.rew).toBe('prog');
    expect(nav).toContain("{ prog: ['prog', 'rew'], rew: ['prog', 'rew'] }");
    for (const l of locales) expect(json(`src/i18n/locales/${l}/nav.json`).achievements).toBeTruthy();
    expect(json('src/i18n/locales/ar-SA/nav.json').achievements).toBe('إنجازاتي');
  });
  it('keeps both pages reachable at their old addresses', () => {
    expect(read('src/components/layout/AppShell.tsx')).toMatch(/prog: Progress, rew: Rewards/);
  });
});
