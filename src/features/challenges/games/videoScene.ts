import { COLOR_IDS } from '../catalog.ts';

// "Focus for a moment" gets a new scene each time: 2 to 5 balloons with their own colours, times and sides,
// different birds, and sometimes a camel, a star or another palm. The questions come from a bank and are
// worked out from the scene itself, so the answer is always what was really shown.

export const DURATION = 24;
export const BALLOON_S = 5.5;
export const BIRD_S = 5;
export const CAMEL_S = 7;
export const STAR_S = 4;
// Balloon colours: the ones easy to tell apart on the sky.
export const BALLOON_COLORS = [0, 1, 2, 3, 4];

export type Dir = 'right' | 'left';
export interface Balloon { t: number; c: number; x: number }
export interface Bird { t: number; from: Dir; k: number }
export interface VScene {
  balloons: Balloon[];
  birds: Bird[];
  camel: { t: number; from: Dir } | null;
  star: { t: number; x: number } | null;
  palms: number;
}

export type VKind = 'num' | 'color' | 'dir' | 'yesno' | 'kind';
export interface VQuestion { id: string; kind: VKind; o: string[]; a: string; p?: Record<string, string> }

type Rand = () => number;
const pick = <T,>(a: T[], r: Rand) => a[Math.floor(r() * a.length)];
const between = (lo: number, hi: number, r: Rand) => lo + Math.floor(r() * (hi - lo + 1));
const shuffle = <T,>(a: T[], r: Rand) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** A new random scene. Easy has fewer things on screen. Every event gets its own moment, so none hide each other. */
export function makeScene(easy: boolean, r: Rand = Math.random): VScene {
  const nBalloons = easy ? between(2, 3, r) : between(2, 5, r);
  const nBirds = easy ? 1 : between(1, 3, r);
  const camel = !easy && r() < 0.6;
  const star = !easy && r() < 0.5;
  const events = nBalloons + nBirds + (camel ? 1 : 0) + (star ? 1 : 0);
  // Moments from 2 to 17 seconds, at least 1.5 apart, so everything finishes before the scene ends.
  const slots = shuffle(Array.from({ length: 11 }, (_, i) => 2 + i * 1.5), r).slice(0, events).sort((a, b) => a - b);
  const order = shuffle([
    ...Array(nBalloons).fill('b'), ...Array(nBirds).fill('r'), ...(camel ? ['c'] : []), ...(star ? ['s'] : []),
  ] as string[], r);
  const sc: VScene = { balloons: [], birds: [], camel: null, star: null, palms: between(1, 3, r) };
  order.forEach((kind, i) => {
    const t = slots[i];
    if (kind === 'b') sc.balloons.push({ t, c: pick(BALLOON_COLORS, r), x: between(170, 470, r) });
    if (kind === 'r') sc.birds.push({ t, from: r() < 0.5 ? 'right' : 'left', k: between(0, 2, r) });
    if (kind === 'c') sc.camel = { t: Math.min(t, DURATION - CAMEL_S - 1), from: r() < 0.5 ? 'right' : 'left' };
    if (kind === 's') sc.star = { t, x: between(90, 470, r) };
  });
  return sc;
}

/** Counts, colours and order, so the next scene can be checked against the last one. */
export const signature = (s: VScene) => JSON.stringify([s.balloons.map((b) => b.c), s.birds.map((b) => b.from), !!s.camel, !!s.star, s.palms]);

/** A new scene that isn't the same as the one before. */
export function freshScene(easy: boolean, last: string | null, r: Rand = Math.random): VScene {
  let s = makeScene(easy, r);
  for (let i = 0; i < 8 && signature(s) === last; i++) s = makeScene(easy, r);
  return s;
}

const nums = (a: number) => {
  const lo = Math.max(1, Math.min(a - 1, 5 - 2));
  return [lo, lo + 1, lo + 2].map(String);
};
const colorOpts = (a: number, r: Rand) => shuffle([a, ...shuffle(BALLOON_COLORS.filter((c) => c !== a), r).slice(0, 2)], r).map((c) => COLOR_IDS[c]);

/** Every question that fits this scene. */
export function questionBank(s: VScene, r: Rand = Math.random): VQuestion[] {
  const q: VQuestion[] = [];
  const nb = s.balloons.length;
  q.push({ id: 'balloons', kind: 'num', o: nums(nb), a: String(nb) });
  const last = s.balloons[nb - 1].c;
  q.push({ id: 'lastColor', kind: 'color', o: colorOpts(last, r), a: COLOR_IDS[last] });
  const first = s.balloons[0].c;
  if (nb > 1 && first !== last) q.push({ id: 'firstColor', kind: 'color', o: colorOpts(first, r), a: COLOR_IDS[first] });
  const counts = BALLOON_COLORS.map((c) => s.balloons.filter((b) => b.c === c).length);
  const twice = BALLOON_COLORS.find((c) => counts[c] >= 2);
  if (twice != null) q.push({ id: 'colorCount', kind: 'num', o: nums(counts[twice]), a: String(counts[twice]), p: { color: COLOR_IDS[twice] } });
  q.push({ id: 'birds', kind: 'num', o: ['1', '2', '3'], a: String(s.birds.length) });
  q.push({ id: 'birdFrom', kind: 'dir', o: ['right', 'left'], a: s.birds[0].from });
  if (s.camel) q.push({ id: 'camelFrom', kind: 'dir', o: ['right', 'left'], a: s.camel.from });
  q.push({ id: 'star', kind: 'yesno', o: ['yes', 'no'], a: s.star ? 'yes' : 'no' });
  q.push({ id: 'palms', kind: 'num', o: ['1', '2', '3'], a: String(s.palms) });
  const kinds: [string, number][] = [['balloon', s.balloons[0].t], ['bird', s.birds[0].t], ...(s.camel ? [['camel', s.camel.t] as [string, number]] : [])];
  const firstKind = kinds.sort((a, b) => a[1] - b[1])[0][0];
  q.push({ id: 'first', kind: 'kind', o: kinds.map((k) => k[0]).sort(), a: firstKind });
  return q;
}

/** Two easy questions or three normal ones, always starting with something about the balloons. */
export function pickQuestions(s: VScene, easy: boolean, r: Rand = Math.random): VQuestion[] {
  const bank = questionBank(s, r);
  const pool = easy ? bank.filter((x) => ['balloons', 'birds', 'star', 'palms'].includes(x.id)) : bank;
  const balloon = shuffle(pool.filter((x) => ['balloons', 'lastColor', 'firstColor', 'colorCount'].includes(x.id)), r)[0];
  const rest = shuffle(pool.filter((x) => x !== balloon), r);
  return [balloon, ...rest].slice(0, easy ? 2 : 3);
}

/** The scene's captions, for anyone who turns them on, in time order. */
export function captions(s: VScene): [number, string, Record<string, string>?][] {
  const c: [number, string, Record<string, string>?][] = [[0, 'calm']];
  s.balloons.forEach((b) => c.push([b.t, 'balloon', { color: COLOR_IDS[b.c] }]));
  s.birds.forEach((b) => c.push([b.t, b.from === 'right' ? 'birdRight' : 'birdLeft']));
  if (s.camel) c.push([s.camel.t, s.camel.from === 'right' ? 'camelRight' : 'camelLeft']);
  if (s.star) c.push([s.star.t, 'star']);
  c.sort((a, b) => a[0] - b[0]);
  c.push([DURATION - 3, 'end']);
  return c;
}
