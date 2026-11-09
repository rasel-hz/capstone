import { currentNode, type NodeKind, type PathNode, type PathPlan, type ThemeId } from './planner.ts';

// The geometry of the map, as plain deterministic data. Everything is in world units, 390 wide, so the
// map is designed for a portrait phone and every position stays valid for any number of steps.
// The same plan always gives the same world. Nothing here knows about a particular user's level.

export const WORLD_W = 390;
const LANES = [104, 195, 286];
const WIND = [0, 1, 2, 1];
const BANNER = 96;
const FIRST_STOP = 170;
const STEP = 176;
const LAST_PAD = 130;
const GAP = 120;

export type BiomeId = 'welcome' | 'garden' | 'calm' | 'hill';
const BIOMES: BiomeId[] = ['welcome', 'garden', 'calm', 'hill'];
const THEME_BIOME: Record<ThemeId, BiomeId> = {
  gentle: 'welcome', other: 'welcome', social: 'welcome',
  organize: 'garden', study: 'garden', work: 'garden',
  stress: 'calm', sleep: 'calm',
  focus: 'hill', start: 'hill', habits: 'hill',
};

export interface Stop { key: string; i: number; ch: number; kind: NodeKind; x: number; y: number }
export interface Segment { from: string; to: string; d: string; bridge: boolean }
export type DecorType = 'palm' | 'bush' | 'rock' | 'flower' | 'lily' | 'ripple' | 'islet' | 'reed' | 'hedge' | 'stones';
export interface Decor { t: DecorType; x: number; y: number; s: number; flip: boolean }
export interface Chapter {
  ch: number; biome: BiomeId; top: number; bottom: number; bannerY: number;
  /** The route through this chapter's island. Drawn thick, it becomes the coastline. */
  land: string;
  decor: Decor[];
}
export interface World { height: number; chapters: Chapter[]; stops: Stop[]; segments: Segment[] }

const between = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const m = (a.y + b.y) / 2;
  return `M${a.x} ${a.y}C${a.x} ${m} ${b.x} ${m} ${b.x} ${b.y}`;
};

function chained(pts: { x: number; y: number }[]) {
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const m = (pts[i - 1].y + pts[i].y) / 2;
    d += `C${pts[i - 1].x} ${m} ${pts[i].x} ${m} ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

/** A small seeded generator, so scenery looks hand-placed but never changes between visits. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One look per chapter, from its theme. A neighbour with the same look moves on to the next one. */
export function biomesFor(themes: ThemeId[], chapters: number): BiomeId[] {
  const out: BiomeId[] = [];
  for (let c = 0; c < chapters; c++) {
    let b = THEME_BIOME[themes[c] ?? 'gentle'] ?? 'welcome';
    if (c > 0 && b === out[c - 1]) b = BIOMES[(BIOMES.indexOf(b) + 1) % BIOMES.length];
    out.push(b);
  }
  return out;
}

const WATER: Record<BiomeId, DecorType[]> = { welcome: ['lily', 'ripple', 'stones'], garden: ['ripple', 'islet', 'lily'], calm: ['lily', 'reed', 'ripple'], hill: ['rock', 'ripple', 'islet'] };
const SHORE: Record<BiomeId, DecorType[]> = { welcome: ['palm', 'bush', 'rock'], garden: ['hedge', 'flower', 'palm'], calm: ['reed', 'palm', 'flower'], hill: ['rock', 'bush', 'palm'] };

// Scenery goes where the route isn't: out on the water opposite each stop, and on the island beside it,
// clear of the step's label and of the space above it where Numo stands.
function placeDecor(ch: number, biome: BiomeId, stops: Stop[]): Decor[] {
  const rnd = seeded(ch * 7919 + 101 + stops.length * 31);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const out: Decor[] = [];
  for (const st of stops) {
    const left = st.x < WORLD_W / 2;
    const centre = Math.abs(st.x - WORLD_W / 2) < 20;
    if (!centre) {
      out.push({ t: pick(WATER[biome]), x: left ? 322 + rnd() * 44 : 24 + rnd() * 44, y: st.y - 36 + rnd() * 72, s: 0.8 + rnd() * 0.4, flip: rnd() > 0.5 });
      out.push({ t: pick(SHORE[biome]), x: st.x + (left ? -1 : 1) * (58 + rnd() * 10), y: st.y - 10 - rnd() * 16, s: 0.62 + rnd() * 0.22, flip: rnd() > 0.5 });
    } else {
      out.push({ t: pick(WATER[biome]), x: 30 + rnd() * 30, y: st.y + rnd() * 30, s: 0.9, flip: false });
      out.push({ t: pick(WATER[biome]), x: 330 + rnd() * 30, y: st.y - 30 + rnd() * 30, s: 0.9, flip: true });
    }
  }
  return out.sort((a, b) => a.y - b.y);
}

export function layoutWorld(plan: PathPlan): World {
  const count = Math.max(...plan.nodes.map((n) => n.ch)) + 1;
  const biomes = biomesFor(plan.themes, count);
  const stops: Stop[] = [];
  const chapters: Chapter[] = [];
  let top = 0;
  let i = 0;
  for (let ch = 0; ch < count; ch++) {
    const nodes = plan.nodes.filter((n) => n.ch === ch);
    const here: Stop[] = nodes.map((n, k) => {
      const lane = n.kind === 'milestone' ? 1 : WIND[(k + ch * 2) % WIND.length];
      return { key: n.key, i: i++, ch, kind: n.kind, x: LANES[lane], y: top + FIRST_STOP + k * STEP };
    });
    const last = here[here.length - 1] ?? { x: LANES[1], y: top + FIRST_STOP };
    const bottom = last.y + LAST_PAD;
    const first = here[0] ?? last;
    // The island runs a little past the first and last stops, so they don't sit on the very edge.
    const land = chained([{ x: first.x, y: first.y - 34 }, ...here, { x: last.x, y: last.y + 56 }]);
    chapters.push({ ch, biome: biomes[ch], top, bottom: bottom + GAP / 2, bannerY: top + BANNER / 2 + 2, land, decor: placeDecor(ch, biomes[ch], here) });
    stops.push(...here);
    top = bottom + GAP;
  }
  const segments: Segment[] = stops.slice(1).map((b, k) => ({ from: stops[k].key, to: b.key, d: between(stops[k], b), bridge: stops[k].ch !== b.ch }));
  return { height: top - GAP / 2, chapters, stops, segments };
}

/** Points along the route between two stops, for Numo to travel through. */
export function routePoints(a: Stop, b: Stop, n = 9) {
  const m = (a.y + b.y) / 2;
  const at = (p0: number, p1: number, p2: number, p3: number, t: number) => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };
  return Array.from({ length: n }, (_, k) => {
    const t = k / (n - 1);
    return { x: at(a.x, a.x, b.x, b.x, t), y: at(a.y, m, m, b.y, t) };
  });
}

export const lastDone = (plan: PathPlan): PathNode | undefined => [...plan.nodes].reverse().find((n) => n.done);

/** Where Numo stands right now, from saved progress alone. */
export function standKey(plan: PathPlan): string {
  return currentNode(plan)?.key ?? plan.nodes[plan.nodes.length - 1].key;
}

/** A finished step not yet celebrated on the map, and where Numo goes next. Null means nothing to play. */
export function pendingArrival(plan: PathPlan): { from: string; to: string | null; milestone: boolean } | null {
  const done = lastDone(plan);
  if (!done || plan.seen === done.key) return null;
  return { from: done.key, to: currentNode(plan)?.key ?? null, milestone: done.kind === 'milestone' };
}

export function chapterProgress(plan: PathPlan) {
  const cur = currentNode(plan);
  const ch = cur?.ch ?? plan.nodes[plan.nodes.length - 1].ch;
  return { ch, theme: plan.themes[ch] ?? ('gentle' as ThemeId), done: plan.nodes.filter((n) => n.done).length, total: plan.nodes.length };
}
