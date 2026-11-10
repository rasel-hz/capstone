import type { AppState } from '../../types/index.ts';

// Things set aside in "Let's think it through", with a time to come back to them. They stay on the device.
export const LATER_MAX = 20;

/** When "in an hour", "tonight" and "tomorrow morning" fall, from now. Tonight is 9 pm, or an hour from now if that's later. */
export function laterTime(when: 'hour' | 'tonight' | 'tomorrow', now = new Date()): number {
  if (when === 'hour') return now.getTime() + 3600e3;
  const d = new Date(now);
  if (when === 'tonight') {
    d.setHours(21, 0, 0, 0);
    return Math.max(d.getTime(), now.getTime() + 3600e3);
  }
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

/** A time typed as HH:MM, today if it hasn't passed yet, otherwise tomorrow. */
export function atClock(hhmm: string, now = new Date()): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  const d = new Date(now);
  d.setHours(+m[1], +m[2], 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function addLater(s: AppState, texts: string[], at: number) {
  for (const text of texts) s.later.push({ id: `l${Date.now().toString(36)}${s.later.length}`, text: text.slice(0, 80), at });
  s.later = s.later.slice(-LATER_MAX);
}

export const dueLater = (s: AppState, now = Date.now()) => s.later.filter((x) => x.at <= now);

export function doneLater(s: AppState, id: string) {
  s.later = s.later.filter((x) => x.id !== id);
}
