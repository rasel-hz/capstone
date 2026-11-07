import type { AppState, ChallengeId, JourneyId, Program } from '../../types/index.ts';
import { today } from '../../utils/index.ts';
import { JOURNEYS } from '../challenges/catalog.ts';

// A journey as a short program: one challenge a day, a self-rating at the start and at the end.
// Days don't have to be in a row. Missing a day never resets anything; the next step just waits.
export const PROGRAM_DAYS = 7;
export const RATINGS = [1, 2, 3, 4, 5] as const;

const journey = (id: JourneyId) => JOURNEYS.find((j) => j.id === id)!;
export const isRating = (v: unknown): v is number => typeof v === 'number' && RATINGS.includes(v as 1);

/** The challenge for step n (0-based). Short journeys repeat their challenges. */
export function stepChallenge(id: JourneyId, n: number): ChallengeId {
  const a = journey(id).a;
  return a[n % a.length];
}

/** The steps of a program in order, one per day. */
export const programSteps = (id: JourneyId) => Array.from({ length: PROGRAM_DAYS }, (_, i) => stepChallenge(id, i));

export const allDaysDone = (p: Program) => p.days.length >= PROGRAM_DAYS;
export const doneToday = (p: Program, d = today()) => p.days.includes(d);

/** The step showing now: today's if it's still open, otherwise the one done today. */
export function currentStep(p: Program, d = today()) {
  const n = Math.min(PROGRAM_DAYS, p.days.length + (doneToday(p, d) ? 0 : 1));
  return { day: n, id: stepChallenge(p.id, n - 1) };
}

export function startProgram(s: AppState, id: JourneyId, before: number) {
  if (!isRating(before)) return;
  s.prog = { id, days: [], before, started: today() };
  // A program also tells suggestions what the user is working on.
  if (!s.needs.includes(id)) s.needs = [...s.needs.filter((x) => x !== 'gen'), id];
}

/** Counts today for the program when the user completes today's step, from anywhere in the app. */
export function recordProgramDay(s: AppState, done: ChallengeId, d = today()) {
  const p = s.prog;
  if (!p || allDaysDone(p) || doneToday(p, d)) return false;
  if (stepChallenge(p.id, p.days.length) !== done) return false;
  p.days.push(d);
  return true;
}

/** Saves the closing rating and keeps the before and after for the progress page. */
export function finishProgram(s: AppState, after: number) {
  const p = s.prog;
  if (!p || !allDaysDone(p) || !isRating(after)) return;
  s.progDone = [...s.progDone, { id: p.id, before: p.before, after, end: today() }].slice(-20);
  s.prog = null;
}

export const leaveProgram = (s: AppState) => { s.prog = null; };

/** Checks a saved program. Anything malformed is dropped rather than half-used. */
export function validProgram(raw: unknown): Program | null {
  const p = raw as Partial<Program> | null;
  if (!p || !JOURNEYS.some((j) => j.id === p.id) || !isRating(p.before) || !Array.isArray(p.days)) return null;
  const days = [...new Set(p.days.filter((x) => typeof x === 'string' && x.length < 40))].slice(0, PROGRAM_DAYS);
  return { id: p.id!, days, before: p.before, started: typeof p.started === 'string' ? p.started : today() };
}
