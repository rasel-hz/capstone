import type { ChallengeId } from '../../types/index.ts';
import raw from './content.json' with { type: 'json' };

// The approved dhikr, generated and verified by scripts/build-dhikr-content.mjs. Nothing here is written by
// hand or by an AI: every text is verbatim from its source, and docs/dhikr-challenges.md lists the evidence.

export type DhikrId = 'dhikr_morning' | 'dhikr_evening' | 'dhikr_calm_heart' | 'dhikr_moment' | 'dhikr_sleep';
export const DHIKR_IDS: DhikrId[] = ['dhikr_morning', 'dhikr_evening', 'dhikr_calm_heart', 'dhikr_moment', 'dhikr_sleep'];
export const isDhikr = (id: string): id is DhikrId => (DHIKR_IDS as string[]).includes(id);

export interface DhikrRef {
  book: string;
  number: number;
  grade: string;
  /** The reference in Arabic, as shown: book, number and, for the Sunan, al-Albani's grading. */
  text: string;
  url: string;
}
export interface QuranPart { surah: number; name: string; basmala: string | null; ayat: { n: number; text: string }[] }
export interface DhikrItem {
  kind: 'hadith' | 'quran' | 'steps';
  /** Hadith-based items: the words to say, verbatim from the hadith. */
  text?: string;
  /** Quran items: the surahs or ayat, verbatim from the Tanzil text. */
  parts?: QuranPart[];
  /** Tasbih before sleep: three phrases, each with its own count. */
  steps?: { text: string; count: number }[];
  /** How many times, as stated in the hadith. Null when the hadith gives no number: then it's up to the user. */
  count: number | null;
  ref: DhikrRef;
  quran?: string[];
  hisn?: { chapter: number; chapterTitle?: string; id: number; match: number };
}

interface Content {
  sources: Record<'hadith' | 'quran' | 'check', { name: string; url: string; license: string }>;
  items: Record<string, DhikrItem>;
  challenges: Record<DhikrId, string[]>;
}
const CONTENT = raw as unknown as Content;
export const DHIKR_SOURCES = CONTENT.sources;

/** The approved items of one challenge, in order, with their stable keys. */
export const dhikrItems = (id: DhikrId): { key: string; item: DhikrItem }[] =>
  CONTENT.challenges[id].map((key) => ({ key, item: CONTENT.items[key] }));

/** Each counted step of an item: one for most, three for the tasbih before sleep. Null target means free. */
export const stepsOf = (item: DhikrItem): { text: string | null; target: number | null }[] =>
  item.steps ? item.steps.map((s) => ({ text: s.text, target: s.count })) : [{ text: null, target: item.count }];

// When each challenge fits, by the user's local clock. These windows are this app's choice for suggestions,
// not a religious ruling: the lists themselves can be opened at any time from the challenges page.
const WINDOWS: Partial<Record<DhikrId, [number, number]>> = {
  dhikr_morning: [4, 12],
  dhikr_evening: [15, 23],
  dhikr_sleep: [20, 4],
};
export function dhikrFitsNow(id: ChallengeId, now = new Date()): boolean {
  if (!isDhikr(id)) return true;
  const w = WINDOWS[id];
  if (!w) return true;
  const h = now.getHours();
  return w[0] < w[1] ? h >= w[0] && h < w[1] : h >= w[0] || h < w[1];
}
/** The dhikr challenges that fit the user's time now, for the companion's list of activities. */
export const dhikrNow = (now = new Date()): DhikrId[] => DHIKR_IDS.filter((id) => dhikrFitsNow(id, now));
/** The time a challenge is meant for, for the label on its card. */
export const dhikrTime = (id: DhikrId): 'morning' | 'evening' | 'sleep' | null =>
  id === 'dhikr_morning' ? 'morning' : id === 'dhikr_evening' ? 'evening' : id === 'dhikr_sleep' ? 'sleep' : null;
