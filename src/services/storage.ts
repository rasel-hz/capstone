import type { AppState } from '../types';
import { today } from '../utils';
import { CITIES, isMethod, roundCoord, validTz, type PrayerPlace } from '../features/prayer/times';
import { validBuddy } from '../features/buddy/buddy';
import { validProgram } from '../features/program/program';
import { validPlan } from '../features/path/planner';
import { validProfile } from '../features/profile/questions';

// Storage sits behind this interface so a real backend can replace it later.
export interface StateRepository {
  load(): Partial<AppState> | null;
  save(state: AppState): void;
  clear(): void;
}

const KEY = 'kw2';
const THREE_DAYS = 3 * 864e5;

export const defaultState = (): AppState => ({
  started: 0, done: 0, name: '', g: 'm', needs: [], sched: 'work', pat: '', sleep: '', pp: 30, prayer: '',
  snd: 1, rm: 0, notif: 0, ctx: [], pend: null, hist: [], en: [], xp: 0, view: 'home', chat: [], mission: null,
  pref: null, drive: 0, driving: 0, last: Date.now(), theme: '', comeback: 0, lastDaily: null, aiConsent: null, prayerDay: '', city: '', largeText: 0, lang: 'ar-SA', fb: [],
  prayerOn: 1, prayerAsk: 1, prayerMethod: 'umm_al_qura', prayerAsr: 0, loc: null, prayerAck: null, prayerBreak: null,
  prog: null, progDone: [], goals: null, nrg: 0, nrgD: '', fullDays: [], missed: 0, brief: null, later: [],
  prof: null, path: null, rest: [], streakDays: [], streakOn: 1, streakGrace: 1, streakSeen: 0,
});

export const localRepository: StateRepository = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      return null;
    }
  },
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage can be full or blocked; the app keeps working in memory.
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing to clear when storage is blocked.
    }
  },
};

export function hydrate(saved: Partial<AppState> | null, now = Date.now()): AppState {
  const s: AppState = Object.assign(defaultState(), saved || {});
  if (s.hist.length && now - s.last > THREE_DAYS) {
    s.comeback = 1;
    // A warm hello, never a lost streak or a sad buddy.
    s.missed = 1;
  }
  s.last = now;
  // A prayer time is entered for one day only (reference 19.3).
  if (s.prayer && s.prayerDay !== today()) s.prayer = '';
  if (typeof s.city !== 'string' || !Object.hasOwn(CITIES, s.city)) s.city = '';
  if (s.lang !== 'en') s.lang = 'ar-SA';
  if (!Array.isArray(s.fb)) s.fb = [];
  s.prayerOn = s.prayerOn === 0 ? 0 : 1;
  s.prayerAsk = s.prayerAsk === 0 ? 0 : 1;
  // The driving settings are no longer shown, so a saved "driving now" could never be switched off. It is cleared here.
  s.driving = 0;
  if (!isMethod(s.prayerMethod)) s.prayerMethod = 'umm_al_qura';
  s.prayerAsr = s.prayerAsr === 1 ? 1 : 0;
  const l = s.loc as PrayerPlace | null;
  s.loc = l && Number.isFinite(l.lat) && Number.isFinite(l.lng) && validTz(l.tz) ? { lat: roundCoord(l.lat), lng: roundCoord(l.lng), tz: l.tz } : null;
  if (s.prayerAck && (typeof s.prayerAck.key !== 'string' || !['prayed', 'later', 'back'].includes(s.prayerAck.v))) s.prayerAck = null;
  const b = s.prayerBreak;
  if (b && !(typeof b.start === 'number' && b.mins > 0 && b.mins <= 120 && typeof b.key === 'string')) s.prayerBreak = null;
  s.prog = validProgram(s.prog);
  s.progDone = Array.isArray(s.progDone) ? s.progDone.filter((r) => r && typeof r.before === 'number' && typeof r.after === 'number') : [];
  validBuddy(s);
  s.missed = s.missed ? 1 : 0;
  s.later = (Array.isArray(s.later) ? s.later : []).filter((x) => x && typeof x.id === 'string' && typeof x.text === 'string' && typeof x.at === 'number' && Number.isFinite(x.at))
    .slice(-20).map((x) => ({ id: x.id.slice(0, 30), text: x.text.slice(0, 80), at: x.at }));
  const br = s.brief;
  s.brief = br && typeof br.d === 'string' && typeof br.lang === 'string' && typeof br.text === 'string' && br.text.length <= 700 ? { d: br.d, lang: br.lang, text: br.text, ...(typeof br.nudge === 'string' ? { nudge: br.nudge.slice(0, 200) } : {}) } : null;
  s.prof = validProfile(s.prof);
  s.path = validPlan(s.path);
  s.rest = Array.isArray(s.rest) ? s.rest.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-60) : [];
  s.streakDays = Array.isArray(s.streakDays) ? s.streakDays.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-400) : [];
  s.streakOn = s.streakOn === 0 ? 0 : 1;
  s.streakGrace = s.streakGrace === 0 ? 0 : 1;
  s.streakSeen = Number.isFinite(s.streakSeen) ? s.streakSeen : 0;
  return s;
}
