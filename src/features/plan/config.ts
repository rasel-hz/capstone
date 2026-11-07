// A personal planning session: the user's own tasks, passed from the chat to the planning game.
// Only user wording and clearly labelled suggestions go in. Nothing here is invented or generic.

/** 'user' is text the user wrote. 'suggested' is an optional idea from the app, always labelled as such. */
export type TaskSource = 'user' | 'suggested';

export interface PlanTask {
  /** Stable within the session, so moves and language switches never lose a card. */
  id: string;
  /** Exactly as the user wrote it, never translated. Empty for suggestions, which use `key`. */
  text: string;
  src: TaskSource;
  /** Locale key under games.plan.suggest, for suggestions only. */
  key?: string;
}

export interface PlanConfig {
  v: 1;
  /** Marks this as personal, so the game never falls back to an example scenario. */
  kind: 'personal';
  tasks: PlanTask[];
  /** Minutes the user said they have. Unknown means priority-only unless the user adds it. */
  minutes?: number;
}

export const MAX_TASKS = 6;
export const MAX_TASK_LEN = 60;
export const SUGGESTIONS = ['break'] as const;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, MAX_TASK_LEN);

/** Builds a config from tasks the user stated. Adds an optional break after work, clearly marked. */
export function buildPlanConfig(tasks: string[], opts: { minutes?: number; afterWork?: boolean } = {}): PlanConfig {
  const seen = new Set<string>();
  const list: PlanTask[] = [];
  for (const raw of tasks) {
    const text = clean(raw);
    const k = text.toLowerCase();
    if (!text || seen.has(k) || list.length >= MAX_TASKS) continue;
    seen.add(k);
    list.push({ id: `u${list.length + 1}`, text, src: 'user' });
  }
  if (opts.afterWork && list.length) list.push({ id: 's1', text: '', src: 'suggested', key: 'break' });
  return { v: 1, kind: 'personal', tasks: list, ...(opts.minutes ? { minutes: opts.minutes } : {}) };
}

/** Checks a config read from saved data or built elsewhere. Anything malformed becomes undefined. */
export function validatePlanConfig(raw: unknown): PlanConfig | undefined {
  const c = raw as Partial<PlanConfig> | null;
  if (!c || c.v !== 1 || c.kind !== 'personal' || !Array.isArray(c.tasks)) return undefined;
  const ids = new Set<string>();
  const tasks: PlanTask[] = [];
  for (const t of c.tasks.slice(0, MAX_TASKS + SUGGESTIONS.length)) {
    if (!t || typeof t.id !== 'string' || ids.has(t.id)) continue;
    if (t.src === 'user' && typeof t.text === 'string' && clean(t.text)) tasks.push({ id: t.id, text: clean(t.text), src: 'user' });
    else if (t.src === 'suggested' && (SUGGESTIONS as readonly string[]).includes(t.key ?? '')) tasks.push({ id: t.id, text: '', src: 'suggested', key: t.key });
    else continue;
    ids.add(t.id);
  }
  const minutes = typeof c.minutes === 'number' && c.minutes >= 5 && c.minutes <= 480 ? Math.round(c.minutes) : undefined;
  return { v: 1, kind: 'personal', tasks, ...(minutes ? { minutes } : {}) };
}

/** What the user actually decided. Saved with the attempt and the only source for any follow-up. */
export interface PlanResult {
  kind: 'personal';
  now: string[];
  later: string[];
  notToday: string[];
  /** Minutes per task in tonight's plan, in the order the user arranged them. */
  blocks: { id: string; mins: number }[];
  minutes?: number;
  tasks: PlanTask[];
}

export const isPlanResult = (d: unknown): d is PlanResult =>
  !!d && (d as PlanResult).kind === 'personal' && Array.isArray((d as PlanResult).now) && Array.isArray((d as PlanResult).tasks);

/** Objective check only: the blocks must fit the time the user gave. Priorities are never "wrong". */
export function overTime(blocks: { mins: number }[], minutes?: number): number {
  if (!minutes) return 0;
  return Math.max(0, blocks.reduce((n, b) => n + b.mins, 0) - minutes);
}
