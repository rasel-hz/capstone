import type { Challenge, ChallengeCategory, ChallengeId, Journey } from '../../types/index.ts';

// Stable data only. All text lives in the locale files, under challenges.items.<id> and journeys.items.<id>.
export const CHALLENGES: Record<ChallengeId, Challenge> = {
  video: { cat: 'focus', min: 1, xp: 30, k: 'v', hasEasy: true, scored: true },
  mem: { cat: 'memory', min: 2, xp: 25, k: 'm', hasEasy: true, scored: true },
  seq: { cat: 'planning', min: 2, xp: 25, k: 's', hasEasy: true, scored: true },
  time: { cat: 'time', min: 1, xp: 20, k: 't', hasEasy: false, scored: false, retired: true },
  calm: { cat: 'relax', min: 2, xp: 15, k: 'c', hasEasy: false, scored: false },
  start2: { cat: 'real', min: 2, xp: 25, k: 'd', hasEasy: false, scored: false, retired: true },
  attention_scene: { cat: 'focus', min: 2, xp: 25, k: 'a', hasEasy: true, scored: true },
  priority_board: { cat: 'planning', min: 2, xp: 20, k: 'p', hasEasy: true, scored: false, retired: true },
  breakdown: { cat: 'real', min: 3, xp: 25, k: 'b', hasEasy: true, scored: false },
  study_sprint: { cat: 'real', min: 5, xp: 30, k: 'y', hasEasy: false, scored: false },
  emotion_map: { cat: 'relax', min: 1, xp: 0, k: 'e', hasEasy: false, scored: false, selfReport: true },
  calm_landscape: { cat: 'relax', min: 2, xp: 10, k: 'l', hasEasy: false, scored: false },
  micro_start: { cat: 'real', min: 2, xp: 20, k: 'u', hasEasy: true, scored: false },
  thought_sort: { cat: 'relax', min: 3, xp: 15, k: 'o', hasEasy: true, scored: false },
  // Dhikr. The texts are verified and generated (src/features/dhikr/content.json, docs/dhikr-challenges.md).
  dhikr_morning: { cat: 'relax', min: 5, xp: 15, k: 'r', hasEasy: false, scored: false },
  dhikr_evening: { cat: 'relax', min: 5, xp: 15, k: 'g', hasEasy: false, scored: false },
  dhikr_calm_heart: { cat: 'relax', min: 3, xp: 15, k: 'h', hasEasy: false, scored: false },
  dhikr_moment: { cat: 'relax', min: 2, xp: 10, k: 'n', hasEasy: false, scored: false },
  dhikr_sleep: { cat: 'relax', min: 5, xp: 15, k: 'z', hasEasy: false, scored: false, quiet: true },
  // A 20-second screen break, and noticing the surroundings with each sense.
  eye_break: { cat: 'relax', min: 1, xp: 10, k: 'i', hasEasy: false, scored: false },
  grounding: { cat: 'relax', min: 2, xp: 15, k: 'f', hasEasy: false, scored: false },
};

/** Every challenge still offered. Retired ones stay in CHALLENGES only so old history reads. */
export const ACTIVE_IDS = (Object.keys(CHALLENGES) as ChallengeId[]).filter((id) => !CHALLENGES[id].retired);

export const CATEGORIES: ChallengeCategory[] = ['focus', 'memory', 'planning', 'time', 'relax', 'real'];

// How the challenges page groups activities: by what the user wants to do now, not by a condition.
// Text lives under challenges.groups.<id>.
export type GroupId = 'start' | 'focus' | 'calm' | 'think' | 'dhikr';
export const GROUPS: { id: GroupId; ids: ChallengeId[] }[] = [
  { id: 'start', ids: ['micro_start', 'breakdown', 'seq'] },
  { id: 'focus', ids: ['study_sprint', 'video', 'attention_scene', 'mem'] },
  { id: 'calm', ids: ['calm', 'grounding', 'eye_break', 'calm_landscape'] },
  { id: 'think', ids: ['thought_sort', 'emotion_map'] },
  { id: 'dhikr', ids: ['dhikr_morning', 'dhikr_evening', 'dhikr_calm_heart', 'dhikr_moment', 'dhikr_sleep'] },
];

// A retired challenge is replaced in its own place, and new ones go at the end, so a journey already under way keeps its days.
export const JOURNEYS: Journey[] = [
  { id: 'adhd', a: ['video', 'attention_scene', 'thought_sort', 'seq', 'breakdown', 'micro_start', 'calm_landscape', 'mem', 'eye_break', 'study_sprint'] },
  { id: 'anx', a: ['calm', 'calm_landscape', 'thought_sort', 'emotion_map', 'video', 'mem', 'grounding'] },
  { id: 'ocd', a: ['calm', 'thought_sort'] },
  { id: 'mood', a: ['micro_start', 'calm_landscape', 'emotion_map', 'breakdown', 'calm', 'seq'] },
  { id: 'sleep', a: ['calm', 'calm_landscape', 'seq', 'thought_sort'] },
  { id: 'soc', a: ['seq', 'mem'] },
  { id: 'aut', a: ['seq', 'breakdown', 'calm', 'calm_landscape'] },
  { id: 'gen', a: ['video', 'attention_scene', 'mem', 'calm', 'micro_start', 'calm_landscape', 'emotion_map', 'eye_break'] },
];

// Everyday Saudi things for "What do you remember?", drawn in a 24-unit box and filled with the round's colour.
export const MEM_ITEMS: Record<string, string> = {
  dallah: '<path d="M8 21q-2-9 2-13h4q4 4 2 13zM8.6 11L3 7.5l1.4 4.8z"/><circle cx="12" cy="5.6" r="1.7"/>',
  finjan: '<path d="M4.5 8h15l-2.6 10.5h-9.8z"/>',
  date: '<path d="M12 3.5c4 0 6 4 6 8.5s-2 8.5-6 8.5-6-4-6-8.5 2-8.5 6-8.5z"/>',
  lantern: '<path d="M11.2 1.5h1.6v3.2h-1.6zM7.5 5h9l-1.2 3h-6.6zM8 8.5h8v9.5q0 3-4 3t-4-3z"/>',
  palm: '<path d="M10.8 22l1.2-11h1.6l-.6 11zM12.6 11C9 6.5 5 6 2.5 8c3-.6 6.5.4 10.1 3zM12.6 11C16 6.5 20 6 22.5 8c-3-.6-6.5.4-9.9 3zM12.6 11C11 6 8 3 4.5 2.8c3 1.2 5.6 4.2 8.1 8.2zM12.6 11C14 6 17 3 20.5 2.8c-3 1.2-5.4 4.2-7.9 8.2z"/>',
  camel: '<path d="M2.5 9.5L4.5 6l1.6 1.2-.6 2.6q1 2.4 3.5 2.4 1-4 3.5-4t3 3q1.5-2 3-1.5t2.5 3.8v2h-1.5v5h-1.8v-5H10v5H8.2v-5H6.5q-2.2 0-2.8-3.6z"/>',
  tent: '<path d="M2 20.5L12 4l10 16.5zM12 20.5v-5.5" stroke-linejoin="round"/>',
  incense: '<path d="M6.5 10h11l-2.2 6.5h-6.6zM9 16.5h6l1.2 4.5H7.8zM10.4 10q-1.4-3 1.6-6 3 3 1.6 6z"/>',
};
export const COLORS = ['#FF8E83', '#FFD36E', '#8BCDF1', '#A78BFA', '#28785B', '#FFC6A8'];
// Color index to the stable name used in locale keys (games.colors.<name>).
export const COLOR_IDS = ['coral', 'yellow', 'sky', 'lavender', 'green', 'peach'];
