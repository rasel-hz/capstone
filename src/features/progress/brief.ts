import type { AppState } from '../../types/index.ts';
import { tr } from '../../i18n/index.ts';
import { apiUrl } from '../../services/native.ts';
import { today } from '../../utils/index.ts';
import { todayGoals } from '../buddy/buddy.ts';
import { streakOf } from '../streak/streak.ts';

// What the progress brief is written from: counts the app already shows, and the user's own last few chat lines.
// The name, journeys chosen and anything typed inside challenges are never sent.
const WEEK = 7 * 864e5;
const RECENT = 2 * 864e5;

export interface BriefInput {
  lang: 'ar-SA' | 'en';
  gender: 'm' | 'f';
  stats: {
    activeDays: number;
    streak: number;
    longest: number;
    week: number;
    total: number;
    names: string[];
    goalsDone: number;
    goalsSet: number;
    energy: 'high' | 'mid' | 'low' | null;
    journeys: { name: string; before: number; after: number }[];
    /** Challenges finished today, by name, and whether today is a rest day. */
    today: string[];
    rest: boolean;
    /** Whole days since the last finished challenge before today, or null if none. */
    gap: number | null;
  };
  notes: string[];
  /** The last bubble shown (headline | nudge), so the next one says something different. */
  previous: string;
}

export function briefInput(s: AppState, now = Date.now()): BriefInput {
  const done = s.hist.filter((h) => h.status === 'COMPLETED');
  const week = done.filter((h) => now - h.ts < WEEK);
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const todays = done.filter((h) => h.ts >= startOfToday);
  const before = done.filter((h) => h.ts < startOfToday).map((h) => h.ts);
  const lastBefore = before.length ? Math.max(...before) : null;
  const streak = streakOf(s, new Date(now));
  const goals = todayGoals(s);
  const last = s.en[s.en.length - 1];
  return {
    lang: s.lang === 'en' ? 'en' : 'ar-SA',
    gender: s.g === 'f' ? 'f' : 'm',
    stats: {
      activeDays: new Set(week.map((h) => new Date(h.ts).toDateString())).size,
      streak: streak.current,
      longest: streak.longest,
      week: week.length,
      total: done.length,
      names: [...new Set(week.map((h) => h.id))].slice(0, 8).map((id) => tr(`challenges.items.${id}.name`)),
      goalsDone: goals.filter((g) => g.done).length,
      goalsSet: goals.length,
      energy: last && last.d === today() ? last.e : null,
      journeys: s.progDone.slice(-5).map((r) => ({ name: tr(`journeys.items.${r.id}.name`), before: r.before, after: r.after })),
      today: [...new Set(todays.map((h) => h.id))].map((id) => tr(`challenges.items.${id}.name`)),
      rest: streak.todayRest,
      gap: lastBefore == null ? null : Math.floor((startOfToday - lastBefore) / 864e5),
    },
    // The user's own messages from today and yesterday only, never the companion's. Older talk is out of date.
    notes: s.chat.filter((m) => !m.b && !m.card && !m.sug && m.t && m.at && now - m.at < RECENT).slice(-6).map((m) => m.t),
    previous: s.brief ? [s.brief.text, s.brief.nudge].filter(Boolean).join(' | ') : '',
  };
}

export interface BriefText { headline: string; nudge: string }

export async function requestBrief(input: BriefInput): Promise<BriefText> {
  const res = await fetch(apiUrl('/v1/progress/brief'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`brief_${res.status}`);
  const data = (await res.json()) as { headline?: unknown; nudge?: unknown };
  if (typeof data.headline !== 'string' || !data.headline.trim()) throw new Error('brief_empty');
  return { headline: data.headline.trim(), nudge: typeof data.nudge === 'string' ? data.nudge.trim() : '' };
}

/** Plain words from the same counts, for when the AI isn't available. The figures themselves show on the page. */
export function fallbackBrief(input: BriefInput): BriefText {
  const started = input.stats.week > 0;
  return { headline: tr(started ? 'progress.brief.fallback' : 'progress.brief.fallbackStart'), nudge: tr('progress.brief.fallbackNudge') };
}
