import type { AppState } from '../types';

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
  pref: null, drive: 0, driving: 0, last: Date.now(), theme: '', comeback: 0, lastDaily: null, aiConsent: null,
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
  return s;
}
