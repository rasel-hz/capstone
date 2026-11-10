import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { passwordLogin } from '../server/auth';
import { CHALLENGES, GROUPS } from '../src/features/challenges/catalog';
import { GAMES } from '../src/features/challenges/games';
import { EYE_SECONDS, secondsLeft } from '../src/features/challenges/games/EyeBreakGame';
import { groundingDone, STAGES } from '../src/features/challenges/games/GroundingGame';
import { fillName, named } from '../src/features/companion/name';
import { TAB_OF } from '../src/components/navigation/NavBar';
import { AuthError, login } from '../src/services/auth';
import { canRedeemOnServer, newRequestKey, spendable } from '../src/services/points';

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

describe('5. redeeming rewards', () => {
  it('spends the balance, falling back to points earned before the server supports it', () => {
    expect(spendable({ lifetime: 500, today: 0, unlocks: [], balance: 300 })).toBe(300);
    expect(spendable({ lifetime: 500, today: 0, unlocks: [] })).toBe(500);
    expect(canRedeemOnServer({ lifetime: 500, today: 0, unlocks: [] })).toBe(false);
    expect(canRedeemOnServer({ lifetime: 500, today: 0, unlocks: [], balance: 0 })).toBe(true);
  });
  it('makes keys the server accepts, a new one each time', () => {
    const a = newRequestKey();
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(newRequestKey()).not.toBe(a);
  });
  it('checks and deducts in the database, under a lock, and never below zero', () => {
    const sql = read('supabase/migrations/20261109180000_reward_redemptions.sql');
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/if bal < r\.required_points then/);
    expect(sql).toMatch(/unique \(user_id, request_key\)/);
    expect(sql).not.toMatch(/update public\.point_transactions|delete from public\.point_transactions/);
  });
  it('asks before deducting, and offers to reopen without charging', () => {
    const page = read('src/pages/Rewards/index.tsx');
    expect(page).toContain("setStep('confirm')");
    expect(page).toContain('rewards.my.reopen');
    expect(page).toContain("disabled={step === 'busy'}");
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
    expect(read('src/components/layout/AppShell.tsx')).toContain("view === 'chat' ? 'page--chat' : ''");
    expect(css).toMatch(/main\.page--chat \{ max-width: none;/);
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
  it('puts the user\'s own name in replies, and never the old generic address', () => {
    const old = 'يا بعدي';
    expect(fillName('يا {NAME}، هلا', 'Razan')).toBe('يا Razan، هلا');
    expect(fillName(`${old}، هلا`, 'Sara')).toBe('يا Sara، هلا');
    expect(fillName('يا {NAME}، هلا', '')).toBe('هلا');
    expect(fillName('Hey {NAME}, good to see you', null)).toBe('good to see you');
    expect(fillName('No placeholder here', 'Razan')).toBe('No placeholder here');
  });
  it('has a named and a neutral version of each static greeting', () => {
    expect(named('Razan')).toEqual({ context: 'named', name: 'Razan' });
    expect(named('  ')).toEqual({});
    for (const l of locales) {
      const c = json(`src/i18n/locales/${l}/companion.json`);
      expect(c.rules.understood_named).toContain('{{name}}');
      expect(c.card.savedLighter_named).toContain('{{name}}');
      expect(json(`src/i18n/locales/${l}/dashboard.json`).energyLine.low_named).toContain('{{name}}');
    }
    const all = ['companion', 'dashboard'].map((f) => read(`src/i18n/locales/ar-SA/${f}.json`)).join('');
    expect(all).not.toContain('يا بعدي');
  });
  it('tells the model to use the placeholder and never sends it the name', () => {
    const prompt = read('server/prompt.ts');
    expect(prompt).toMatch(/write exactly .*\{NAME\}/);
    expect(prompt).toMatch(/which you are not given/);
    expect(read('src/features/companion/request.ts')).not.toMatch(/\bname: s\.name|firstName/);
  });
});

describe('10. Achievements', () => {
  const nav = read('src/components/navigation/NavBar.tsx');
  it('is one tab in the main navigation, with Progress and Rewards as tabs inside it', () => {
    expect(nav).not.toMatch(/\['rew', /);
    expect(nav).toContain("prog: 'nav.achieve'");
    expect(TAB_OF.rew).toBe('prog');
    expect(nav).toContain("{ prog: ['prog', 'rew'], rew: ['prog', 'rew'] }");
    for (const l of locales) expect(json(`src/i18n/locales/${l}/nav.json`).achieve).toBeTruthy();
    expect(json('src/i18n/locales/ar-SA/nav.json').achieve).toBe('إنجازاتي');
  });
  it('keeps both pages reachable at their old addresses', () => {
    expect(read('src/components/layout/AppShell.tsx')).toMatch(/prog: Progress, rew: Rewards/);
  });
});
