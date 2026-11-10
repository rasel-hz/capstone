import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(p, 'utf8');
const json = (l: string) => JSON.parse(read(`src/i18n/locales/${l}/landing.json`));

describe('the landing page', () => {
  const page = read('src/pages/Landing/index.tsx');
  const world = read('src/pages/Landing/world.ts');
  const css = read('src/styles/landing.css');

  it('starts the app and opens log-in for real, and keeps the real memory challenge', () => {
    expect(page).toMatch(/d\.started = 1/);
    expect(page).toMatch(/<LoginDialog/);
    expect(page).toMatch(/<MemoryGame/);
    expect(page).toMatch(/<LanguageSwitcher/);
  });

  it('undoes all its motion when it goes away, and starts again in the other language', () => {
    expect(page).toMatch(/return \(\) => \{ w\.destroy\(\);/);
    expect(page).toMatch(/\}, \[i18n\.language\]\);/);
    for (const k of ['cancelAnimationFrame(raf)', 'ctx.revert()', 'offIO.disconnect()', "ScrollTrigger.removeEventListener('refresh'"]) expect(world).toContain(k);
  });

  it('keeps every style to itself: zw- classes, the two shared rules, and reduced motion only on this page', () => {
    expect(css).toMatch(/^\.brand \{/m);
    expect(css).toMatch(/^\.closing \{/m);
    const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/^[^@\s{}][^{]*\{/gm) ?? [];
    for (const sel of selectors) expect(sel, sel).toMatch(/^(\.zw|\.brand|\.closing|:where\(\.zw\)|\[dir="ltr"\] \.zw|to |from |\d+%)/);
    expect(css).not.toMatch(/^\s*\*, \*::before/m);
    expect(page).not.toMatch(/<nav\b/);
  });

  it('has every new text in both languages, with all the plural forms', () => {
    const ar = json('ar-SA');
    const en = json('en');
    for (const l of [ar, en]) {
      for (const k of ['menu', 'heroKey', 'cue', 'focusHint', 'focusTask', 'focusDone', 'breathHint', 'again', 'sample']) expect(l[k], k).toBeTruthy();
      for (const g of ['nav', 'k', 'say', 'tabs', 'dist', 'times', 'poke']) expect(Object.keys(l[g]).length, g).toBeGreaterThan(0);
    }
    for (const f of ['zero', 'one', 'two', 'few', 'many', 'other']) expect(ar[`picked_${f}`], f).toBeTruthy();
    for (const f of ['one', 'other']) expect(en[`picked_${f}`], f).toBeTruthy();
  });
});
