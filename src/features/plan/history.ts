import type { AppState } from '../../types/index.ts';
import { isPlanResult, type PlanTask } from './config.ts';

const TWO_WEEKS = 14 * 864e5;

/** The last plan the user actually made on the planning board, as text, for the AI's context. */
export function lastPlan(s: AppState, now = Date.now()) {
  const a = [...s.hist].reverse().find((h) => h.id === 'seq' && h.status === 'COMPLETED' && isPlanResult(h.data) && now - h.ts < TWO_WEEKS);
  if (!a || !isPlanResult(a.data)) return null;
  const r = a.data;
  // Suggestions are sent by key name in English, which the model reads as "a break".
  const text = (id: string) => {
    const t: PlanTask | undefined = r.tasks.find((x) => x.id === id);
    return t ? (t.src === 'user' ? t.text : `(suggested) ${t.key}`) : '';
  };
  const names = (ids: string[]) => ids.map(text).filter(Boolean);
  return {
    day: new Date(a.ts).toISOString().slice(0, 10),
    now: names(r.now),
    later: names(r.later),
    notToday: names(r.notToday),
    blocks: r.blocks.map((b) => ({ task: text(b.id), mins: b.mins })).filter((b) => b.task),
    minutes: r.minutes ?? null,
  };
}
