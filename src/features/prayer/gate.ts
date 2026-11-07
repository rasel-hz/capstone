import type { AppState, PrayerBreak } from '../../types/index.ts';
import { today } from '../../utils/index.ts';
import { cityPlace, placeNext, placeWindow, type PrayerPlace, type PrayerSettings, type PrayerWindow } from './times.ts';

// Prayer-aware scheduling: a respectful check-in, never a lock. Nothing here verifies anything.
// An answer is the user's own report, kept for one window only, and never affects XP or challenges.

/** Where times come from: a detected location first, then a chosen city. Null when off or unset. */
export function placeOf(s: AppState): PrayerPlace | null {
  if (!s.prayerOn) return null;
  return s.loc ?? (s.city ? cityPlace(s.city) : null);
}

export const settingsOf = (s: AppState): PrayerSettings => ({ method: s.prayerMethod ?? 'umm_al_qura', asr: s.prayerAsr === 1 ? 1 : 0 });

/** The protected window we're in, from calculated times or a time the user entered for today. */
export function currentWindow(s: AppState, now = new Date()): PrayerWindow | null {
  if (!s.prayerOn || !s.pp) return null;
  const place = placeOf(s);
  if (place) return placeWindow(place, s.pp, now, settingsOf(s));
  // A manual time is for one day only; loading the app clears an old one (services/storage.ts).
  if (!s.prayer) return null;
  const [h, m] = s.prayer.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const at = new Date(now);
  at.setHours(h, m, 0, 0);
  const x = now.getTime() - at.getTime();
  if (x < -2 * 60_000 || x >= s.pp * 60_000) return null;
  // Which prayer this is isn't known, so `manual` hides the name everywhere. The id is a placeholder.
  return { id: 'dhuhr', manual: true, at, end: new Date(at.getTime() + s.pp * 60_000), key: `${today()}:manual:${s.prayer}` };
}

export const nextOf = (s: AppState, now = new Date()) => {
  const place = placeOf(s);
  return place ? placeNext(place, now, settingsOf(s)) : null;
};

/** Ask only when the user wants to be asked, and only once per window. */
export function needsCheckIn(s: AppState, now = new Date()): PrayerWindow | null {
  if (!s.prayerAsk) return null;
  const w = currentWindow(s, now);
  if (!w || s.prayerAck?.key === w.key) return null;
  return w;
}

/** Records the answer for this window only. The previous window's answer is replaced, not kept. */
export function acknowledge(s: AppState, w: PrayerWindow | null, v: 'prayed' | 'later' | 'back') {
  if (w) s.prayerAck = { key: w.key, v };
}

export const BREAK_CHOICES = [10, 15, 20, 30];

export function startBreak(s: AppState, w: PrayerWindow | null, mins: number, now = Date.now()) {
  s.prayerBreak = { key: w?.key ?? '', prayer: w && !w.manual ? w.id : null, start: now, mins: Math.max(1, Math.min(120, Math.round(mins))) };
}

/** Milliseconds left on the reminder. Paused reminders hold their time. Never below zero. */
export function breakLeft(b: PrayerBreak, now = Date.now()): number {
  if (b.pausedLeft != null) return Math.max(0, b.pausedLeft);
  return Math.max(0, b.start + b.mins * 60_000 - now);
}

export function pauseBreak(s: AppState, now = Date.now()) {
  if (s.prayerBreak && s.prayerBreak.pausedLeft == null) s.prayerBreak.pausedLeft = breakLeft(s.prayerBreak, now);
}
export function resumeBreak(s: AppState, now = Date.now()) {
  const b = s.prayerBreak;
  if (!b || b.pausedLeft == null) return;
  // Restart the clock from what was left, keeping the same total length.
  b.start = now - (b.mins * 60_000 - b.pausedLeft);
  delete b.pausedLeft;
}
/** Sets a new length from now, for "change duration" and "take more time". */
export function setBreakLength(s: AppState, mins: number, now = Date.now()) {
  if (!s.prayerBreak) return;
  s.prayerBreak.start = now;
  s.prayerBreak.mins = Math.max(1, Math.min(120, Math.round(mins)));
  delete s.prayerBreak.pausedLeft;
}

/**
 * Ends the reminder. Coming back is not a claim of having prayed; it only stops this window's prompt
 * from appearing again.
 */
export function endBreak(s: AppState, now = new Date()) {
  const b = s.prayerBreak;
  s.prayerBreak = null;
  const w = currentWindow(s, now);
  if (b && w && b.key === w.key) acknowledge(s, w, 'back');
}

/** Turning the feature off removes the location, the city, a typed time and every short-lived answer. */
export function turnOff(s: AppState) {
  s.prayerOn = 0;
  s.loc = null;
  s.city = '';
  s.prayer = '';
  s.prayerAck = null;
  s.prayerBreak = null;
}
