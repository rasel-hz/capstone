import type { AppState } from '../../types/index.ts';

// Fields that hold text the user typed into challenges, including personal planning tasks.
export const TYPED = ['task', 'step', 'topic', 'notes', 'steps', 'plan', 'now', 'later', 'notToday', 'first', 'tasks', 'blocks', 'concerns', 'act', 'unsure', 'next'];

const hasTyped = (d: unknown) => !!d && typeof d === 'object' && TYPED.some((k) => k in (d as object));
const strip = (d: unknown) => {
  if (d && typeof d === 'object') TYPED.forEach((k) => delete (d as Record<string, unknown>)[k]);
};

export const typedCount = (s: AppState) => s.hist.filter((h) => hasTyped(h.data)).length + (s.prof?.tasks.length ? 1 : 0);

/** Removes typed text everywhere it is kept. Scores, XP, statuses and dates stay. */
export function clearTypedText(d: AppState) {
  d.hist.forEach((h) => strip(h.data));
  // Personal tasks also sit in an open mission and in chat suggestion cards.
  d.mission?.items.forEach((i) => {
    delete i.cfg;
    strip(i.data);
  });
  d.chat.forEach((m) => { if (m.sug) delete m.sug.cfg; });
  // Tasks from onboarding, and the journey steps built from them.
  if (d.prof) d.prof.tasks = [];
  d.path?.nodes.forEach((n) => { delete n.cfg; });
}
