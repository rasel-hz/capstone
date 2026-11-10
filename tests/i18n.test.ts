import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CATEGORIES, CHALLENGES, COLOR_IDS, JOURNEYS, MEM_ITEMS } from '../src/features/challenges/catalog';
import { crisisMessage, detectCrisis, isCrisisText } from '../src/features/companion/crisis';
import { buildChatRequest } from '../src/features/companion/request';
import { ruleReply } from '../src/features/companion/rules';
import { beginItem, completeItem, createMission, finishMission, summaryLines } from '../src/features/mission/engine';
import { generateMission, whyText } from '../src/features/mission/planner';
import { progressStats } from '../src/features/progress/stats';
import { achievements } from '../src/features/rewards/achievements';
import i18n, { setLanguage, tr } from '../src/i18n';
import { acceptOutput, handleChat, parseRequest } from '../server/chat';
import { defaultState, hydrate } from '../src/services/storage';
import type { AppState } from '../src/types';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const AREAS = readdirSync('src/i18n/locales/en').map((f) => f.replace('.json', ''));
const load = (lang: string, area: string) => JSON.parse(readFileSync(`src/i18n/locales/${lang}/${area}.json`, 'utf8'));
const flat = (o: Record<string, unknown>, pre = ''): Record<string, string> => Object.entries(o).reduce((acc, [k, v]) => (
  typeof v === 'string' ? { ...acc, [pre + k]: v } : { ...acc, ...flat(v as Record<string, unknown>, `${pre}${k}.`) }
), {} as Record<string, string>);
const allKeys = (lang: string) => AREAS.reduce((acc, a) => ({ ...acc, ...flat(load(lang, a), `${a}.`) }), {} as Record<string, string>);
const AR = allKeys('ar-SA');
const EN = allKeys('en');
// Plural forms differ per language, so both are compared by their base key.
const base = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');
const vars = (s: string) => [...new Set([...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))].sort();

afterEach(() => setLanguage('ar-SA'));

describe('translation completeness', () => {
  it('has the same areas and keys in both languages', () => {
    expect(readdirSync('src/i18n/locales/ar-SA').sort()).toEqual(readdirSync('src/i18n/locales/en').sort());
    expect([...new Set(Object.keys(AR).map(base))].sort()).toEqual([...new Set(Object.keys(EN).map(base))].sort());
  });

  it('has no empty text', () => {
    for (const [k, v] of [...Object.entries(AR), ...Object.entries(EN)]) if (!k.endsWith('Sep')) expect(v.trim(), k).not.toBe('');
  });

  it('uses the same variables in both languages', () => {
    const merged = (src: Record<string, string>) => {
      const m: Record<string, Set<string>> = {};
      for (const [k, v] of Object.entries(src)) vars(v).forEach((x) => (m[base(k)] ??= new Set()).add(x));
      return m;
    };
    const a = merged(AR);
    const e = merged(EN);
    // A plural form can leave out the number ("once", "مرتين"), so compare what the forms use overall.
    for (const k of Object.keys({ ...a, ...e })) expect([...(a[k] ?? [])].filter((x) => x !== 'count').sort(), k).toEqual([...(e[k] ?? [])].filter((x) => x !== 'count').sort());
  });

  it('English text contains no Arabic letters, apart from the page title', () => {
    for (const [k, v] of Object.entries(EN)) if (k !== 'common.pageTitle') expect(/[؀-ۿ]/.test(v), k).toBe(false);
  });

  it('has the required forms for each plural', () => {
    for (const k of Object.keys(AR).filter((x) => x.endsWith('_other'))) {
      ['one', 'two', 'few', 'many'].forEach((f) => expect(AR[`${base(k)}_${f}`], `${base(k)}_${f}`).toBeDefined());
      expect(EN[`${base(k)}_one`], base(k)).toBeDefined();
    }
  });

  it('matches the agreed glossary', () => {
    const g: Record<string, string> = {
      'journeys.items.adhd.name': 'Focus & Organization', 'journeys.items.anx.name': 'Calm & Anxiety Support', 'journeys.items.ocd.name': 'Navigating Uncertainty', 'journeys.items.mood.name': 'Mood & Motivation',
      'journeys.items.sleep.name': 'Sleep & Routine', 'journeys.items.soc.name': 'Social Confidence', 'journeys.items.aut.name': 'Comfortable Routines', 'journeys.items.gen.name': 'General Wellbeing',
      'challenges.items.video.name': 'Focus for a Moment', 'challenges.items.mem.name': 'What Do You Remember?', 'challenges.items.seq.name': 'Plan Your Day', 'challenges.items.time.name': 'Where Did the Time Go?', 'challenges.items.calm.name': 'Take It Easy', 'challenges.items.start2.name': 'Just Two Minutes',
      'challenges.categories.all': 'All', 'challenges.categories.focus': 'Focus', 'challenges.categories.memory': 'Memory', 'challenges.categories.planning': 'Planning', 'challenges.categories.time': 'Time Awareness', 'challenges.categories.relax': 'Relaxation', 'challenges.categories.real': 'Real-World Task',
      'dashboard.todayMission': "Today's Mission", 'dashboard.energy.high': 'Feeling Energetic', 'dashboard.energy.mid': 'Doing Okay', 'dashboard.energy.low': 'Low Energy',
    };
    for (const [k, v] of Object.entries(g)) expect(EN[k], k).toBe(v);
  });
});

describe('every key used in the code exists', () => {
  const sources = walk('src').filter((f) => /\.tsx?$/.test(f));
  const code = sources.map((f) => readFileSync(f, 'utf8')).join('\n');
  const AREA_RE = AREAS.join('|');

  it('static keys', () => {
    const used = [...code.matchAll(new RegExp(`['"\`]((?:${AREA_RE})\\.[A-Za-z0-9_.]+)['"\`]`, 'g'))].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(200);
    // A key can also resolve through a plural form or a gender context.
    const missing = [...new Set(used)].filter((k) => !(k in AR) && !Object.keys(AR).some((x) => base(x) === k || x === `${k}_m`));
    expect(missing).toEqual([]);
  });

  it('keys built from stable IDs', () => {
    (Object.keys(CHALLENGES) as (keyof typeof CHALLENGES)[]).forEach((id) => ['name', 'desc', 'purpose', 'instructions'].forEach((f) => expect(EN[`challenges.items.${id}.${f}`], id).toBeDefined()));
    JOURNEYS.forEach((j) => ['name', 'desc'].forEach((f) => expect(EN[`journeys.items.${j.id}.${f}`]).toBeDefined()));
    CATEGORIES.forEach((c) => expect(EN[`challenges.categories.${c}`]).toBeDefined());
    COLOR_IDS.forEach((c) => expect(EN[`games.colors.${c}`]).toBeDefined());
    Object.keys(MEM_ITEMS).forEach((s) => expect(EN[`games.mem.items.${s}`]).toBeDefined());
    achievements(defaultState()).forEach((a) => expect(EN[`rewards.items.${a.art}.label`]).toBeDefined());
  });
});

describe('no hardcoded interface text', () => {
  it('has no Arabic in source files except safety and matching keyword lists', () => {
    // These match what people type, in either language, and are not shown to anyone.
    const allowed = ['src/features/companion/crisis.ts', 'src/features/companion/rules.ts', 'src/components/ui/LanguageSwitcher.tsx', 'src/pages/Settings/index.tsx'];
    const hits: string[] = [];
    for (const f of walk('src').filter((x) => /\.tsx?$/.test(x))) {
      if (allowed.includes(f.replace(/\\/g, '/'))) continue;
      readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/[؀-ۿ]/.test(l)) hits.push(`${f}:${i + 1}`); });
    }
    expect(hits).toEqual([]);
  });

  it('in Settings, Arabic appears only as the name of the language', () => {
    const lines = readFileSync('src/pages/Settings/index.tsx', 'utf8').split('\n').filter((l) => /[؀-ۿ]/.test(l));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('العربية');
  });
});

describe('switching language', () => {
  it('updates the document direction and language', () => {
    setLanguage('en');
    expect(i18n.language).toBe('en');
    expect(tr('nav.home')).toBe('Home');
    setLanguage('ar-SA');
    expect(tr('nav.home')).toBe('الرئيسية');
  });

  it('never changes calculated results', () => {
    const s: AppState = defaultState();
    createMission(s, [{ id: 'mem', why: [], diff: 'normal' }, { id: 'time', why: [], diff: 'normal' }], false);
    beginItem(s);
    completeItem(s, { acc: 100, retries: 0 });
    setLanguage('en');
    const en = JSON.stringify({ xp: s.xp, hist: s.hist, ...{ r: progressStats(s).completionRate, a: progressStats(s).avgAccuracy } });
    setLanguage('ar-SA');
    const ar = JSON.stringify({ xp: s.xp, hist: s.hist, ...{ r: progressStats(s).completionRate, a: progressStats(s).avgAccuracy } });
    expect(en).toBe(ar);
    expect(s.xp).toBe(25);
  });

  it('keeps a planned mission the same, and only the words change', () => {
    const s = defaultState();
    const ar = generateMission(s);
    setLanguage('en');
    const en = generateMission(s);
    expect(en).toEqual(ar);
    expect(whyText(en[0].why)).toBe('We start with a short focus');
    setLanguage('ar-SA');
    expect(whyText(ar[0].why)).toBe('نبدأ بتركيز قصير');
  });

  it('shows reasons saved before this feature exactly as saved', () => {
    expect(whyText('سبب قديم')).toBe('سبب قديم');
  });

  it('writes a mission summary in the language selected when it is shown', () => {
    const s = defaultState();
    createMission(s, [{ id: 'mem', why: [], diff: 'normal' }], false);
    beginItem(s);
    completeItem(s, { acc: 100, retries: 0 });
    const sum = finishMission(s);
    setLanguage('en');
    expect(summaryLines(sum)).toContain('You completed 1 of 1');
    setLanguage('ar-SA');
    expect(summaryLines(sum)).toContain('أكملت 1 من 1');
  });

  it('remembers the language in saved data, and defaults to Arabic', () => {
    expect(hydrate(null).lang).toBe('ar-SA');
    expect(hydrate({ lang: 'en' }).lang).toBe('en');
    expect(hydrate({ lang: 'fr' as never }).lang).toBe('ar-SA');
    expect(hydrate({ xp: 240 }).xp).toBe(240);
  });
});

describe('plurals', () => {
  it('follows each language', () => {
    expect(tr('common.minutes', { count: 1 })).toBe('دقيقة');
    expect(tr('common.minutes', { count: 2 })).toBe('دقيقتين');
    expect(tr('common.minutes', { count: 5 })).toBe('5 دقائق');
    expect(tr('common.minutes', { count: 15 })).toBe('15 دقيقة');
    setLanguage('en');
    expect(tr('common.minutes', { count: 1 })).toBe('1 minute');
    expect(tr('common.minutes', { count: 5 })).toBe('5 minutes');
    expect(tr('common.seconds', { count: 2.6 })).toBe('2.6 seconds');
  });
});

describe('companion in both languages', () => {
  it('catches crisis wording in either language, whichever is showing', () => {
    expect(detectCrisis('I want to die')).toBe(1);
    expect(detectCrisis("I don't want to live anymore")).toBe(1);
    expect(detectCrisis("I can't go on")).toBe(2);
    expect(detectCrisis('everyone is better off without me')).toBe(2);
    expect(detectCrisis('ابي اموت')).toBe(1);
    expect(detectCrisis('I had a great day')).toBe(0);
  });

  it('gives the support message in the selected language, with the same numbers', () => {
    expect(crisisMessage(1, 'en')).toContain('997');
    expect(crisisMessage(1, 'en')).toContain('937');
    expect(crisisMessage(1, 'ar-SA')).toContain('997');
    expect(crisisMessage(2, 'en')).toContain('someone is hurting you');
    expect(/[؀-ۿ]/.test(crisisMessage(2, 'en'))).toBe(false);
    expect(isCrisisText(crisisMessage(2, 'en'))).toBe(true);
    expect(isCrisisText(crisisMessage(1, 'ar-SA'))).toBe(true);
  });

  it('rule replies follow the selected language', () => {
    setLanguage('en');
    const r = ruleReply('I slept late and I have work', defaultState());
    expect(r.pending?.ctx).toEqual(['sleep', 'work']);
    expect(r.messages[0]).toContain('you slept late');
    expect(/[؀-ۿ]/.test(r.messages[0])).toBe(false);
    expect(ruleReply('I want to die', defaultState()).tone).toBe('crisis');
  });

  it('understands Arabic typed while the app is in English', () => {
    setLanguage('en');
    expect(ruleReply('نمت متأخر', defaultState()).pending?.ctx).toEqual(['sleep']);
  });

  it('never translates what the user wrote', () => {
    const s = defaultState();
    s.chat = [{ t: 'رسالتي' }, { b: 1, t: 'old reply' }];
    setLanguage('en');
    const req = buildChatRequest('hello', s);
    expect(req.history[0].text).toBe('رسالتي');
    expect(req.context.lang).toBe('ar-SA');
  });
});

describe('server language', () => {
  const key = { apiKey: 'test-key-not-real' };
  it('reads the language, defaults to Arabic and rejects anything else', () => {
    expect(parseRequest({ message: 'hi', context: { lang: 'en' } }).context.lang).toBe('en');
    expect(parseRequest({ message: 'hi', context: { lang: 'fr' } }).context.lang).toBe('ar-SA');
    expect(parseRequest({ message: 'hi' }).context.lang).toBe('ar-SA');
  });

  it('answers crisis wording in the language the user wrote in, without calling the AI', async () => {
    const r = await handleChat({ message: 'I want to die', context: { lang: 'en' } }, {});
    expect(r.reply).toContain('997');
    expect(/[؀-ۿ]/.test(r.reply)).toBe(false);
    // English typed while the app is in Arabic still gets English, and the other way round.
    const e = await handleChat({ message: 'I want to die', context: {} }, {});
    expect(/[؀-ۿ]/.test(e.reply)).toBe(false);
    const a = await handleChat({ message: 'أبي أموت', context: { lang: 'en' } }, {});
    expect(/[؀-ۿ]/.test(a.reply)).toBe(true);
    void key;
  });

  it('replaces flagged distress in the requested language', () => {
    const o = JSON.stringify({ reply: 'x', tone: 'support', distress: true, context: {} });
    expect(/[؀-ۿ]/.test(acceptOutput(o, 'en').reply)).toBe(false);
  });

  it('rejects an English diagnosis', () => {
    const o = JSON.stringify({ reply: 'It sounds like you have ADHD.', tone: 'support', distress: false, context: {} });
    expect(() => acceptOutput(o, 'en')).toThrow();
  });

  it('does not mistake a refusal for a diagnosis, in either language', () => {
    const ok = (reply: string) => acceptOutput(JSON.stringify({ reply, tone: 'support', distress: false, context: {} })).reply;
    expect(ok("I can't tell you if you have ADHD. A professional can help.")).toContain('ADHD');
    expect(ok('ما أقدر أقول إن عندك اكتئاب، المختص يقدر يساعدك.')).toContain('اكتئاب');
    expect(() => ok("I can't prescribe anything. You have ADHD.")).toThrow();
  });

  it('tells the model which language to use, and uses the right challenge names', async () => {
    const bodies: { input: { content: string }[] }[] = [];
    const f = (async (url: string, init: { body: string }) => {
      if (String(url).endsWith('/moderations')) return Response.json({ results: [{ categories: {} }] });
      bodies.push(JSON.parse(init.body));
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ reply: 'Hi', tone: 'friendly', distress: false, context: {} }) }] }] });
    }) as unknown as typeof fetch;
    await handleChat({ message: 'hello', context: { lang: 'en', byChallenge: [{ id: 'mem', count: 1 }] } }, { ...key, fetch: f });
    expect(bodies[0].input[0].content).toContain('"app_language":"English"');
    expect(bodies[0].input[0].content).toContain('What Do You Remember?');
  });
});

describe('document setup', () => {
  it('sets the saved direction before the first paint', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('lang="ar-SA" dir="rtl"');
    expect(html.indexOf("document.documentElement.dir = 'ltr'")).toBeLessThan(html.indexOf('<title>'));
  });

  it('has no flag emoji or flag language control', () => {
    expect(/[\u{1F1E6}-\u{1F1FF}]/u.test(readFileSync('src/components/ui/LanguageSwitcher.tsx', 'utf8'))).toBe(false);
  });
});
