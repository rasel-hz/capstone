import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(p, 'utf8');

describe('the dark theme', () => {
  it('is a choice in Settings, in both languages', () => {
    expect(read('src/pages/Settings/index.tsx')).toMatch(/const THEMES = \['', 'lilac', 'dark'\];/);
    for (const l of ['ar-SA', 'en']) expect(JSON.parse(read(`src/i18n/locales/${l}/settings.json`)).themes.dark).toBeTruthy();
  });

  it('gives every colour token a dark value and tells the browser', () => {
    const tokens = read('src/styles/tokens.css');
    const dark = tokens.slice(tokens.indexOf('body.dark {'));
    for (const t of ['--iv', '--cr', '--surface', '--ink', '--mut', '--line', '--em-d', '--lav-d']) expect(dark, t).toContain(`${t}:`);
    expect(dark).toContain('color-scheme: dark');
  });

  it('has no solid white backgrounds left in the app styles (the landing page keeps its own look)', () => {
    for (const f of ['components', 'games', 'home', 'journey', 'progress', 'rewards', 'base']) {
      expect(read(`src/styles/${f}.css`), f).not.toMatch(/background(-color)?:\s*#fff(fff)?\b/i);
    }
  });
});
