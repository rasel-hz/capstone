import type { AppState } from '../types';
import { today } from '../utils';
import { CITIES } from '../features/prayer/times';

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
  if (s.hist.length && now - s.last > THREE_DAYS) s.comeback = 1;
  s.last = now;
  // A prayer time is entered for one day only (reference 19.3).
  if (s.prayer && s.prayerDay !== today()) s.prayer = '';
  if (typeof s.city !== 'string' || !Object.hasOwn(CITIES, s.city)) s.city = '';
  if (s.lang !== 'en') s.lang = 'ar-SA';
  if (!Array.isArray(s.fb)) s.fb = [];
  return s;
}
