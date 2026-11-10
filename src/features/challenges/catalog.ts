import type { Challenge, ChallengeCategory, ChallengeId, Journey } from '../../types/index.ts';

// Stable data only. All text lives in the locale files, under challenges.items.<id> and journeys.items.<id>.
export const CHALLENGES: Record<ChallengeId, Challenge> = {
  video: { cat: 'focus', min: 1, xp: 30, k: 'v', hasEasy: true, scored: true },
  mem: { cat: 'memory', min: 2, xp: 25, k: 'm', hasEasy: true, scored: true },
  seq: { cat: 'planning', min: 2, xp: 25, k: 's', hasEasy: true, scored: true },
  time: { cat: 'time', min: 1, xp: 20, k: 't', hasEasy: false, scored: false },
  calm: { cat: 'relax', min: 2, xp: 15, k: 'c', hasEasy: false, scored: false },
  start2: { cat: 'real', min: 2, xp: 25, k: 'd', hasEasy: false, scored: false },
  attention_scene: { cat: 'focus', min: 2, xp: 25, k: 'a', hasEasy: true, scored: true },
  priority_board: { cat: 'planning', min: 2, xp: 20, k: 'p', hasEasy: true, scored: false },
  breakdown: { cat: 'real', min: 3, xp: 25, k: 'b', hasEasy: true, scored: false },
  study_sprint: { cat: 'real', min: 5, xp: 30, k: 'y', hasEasy: false, scored: false },
  emotion_map: { cat: 'relax', min: 1, xp: 0, k: 'e', hasEasy: false, scored: false, selfReport: true },
  calm_landscape: { cat: 'relax', min: 1, xp: 10, k: 'l', hasEasy: false, scored: false },
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

export const CATEGORIES: ChallengeCategory[] = ['focus', 'memory', 'planning', 'time', 'relax', 'real'];

// How the challenges page groups activities: by what the user wants to do now, not by a condition.
// Text lives under challenges.groups.<id>.
export type GroupId = 'arrange' | 'start' | 'focus' | 'calm' | 'think' | 'dhikr';
export const GROUPS: { id: GroupId; ids: ChallengeId[] }[] = [
  { id: 'arrange', ids: ['seq', 'priority_board', 'time'] },
  { id: 'start', ids: ['micro_start', 'start2', 'breakdown', 'study_sprint'] },
  { id: 'focus', ids: ['video', 'attention_scene', 'mem'] },
  { id: 'calm', ids: ['calm', 'calm_landscape', 'eye_break', 'grounding'] },
  { id: 'think', ids: ['thought_sort', 'emotion_map'] },
  { id: 'dhikr', ids: ['dhikr_morning', 'dhikr_evening', 'dhikr_calm_heart', 'dhikr_moment', 'dhikr_sleep'] },
];

export const JOURNEYS: Journey[] = [
  { id: 'adhd', a: ['video', 'attention_scene', 'priority_board', 'seq', 'breakdown', 'micro_start', 'time', 'mem', 'start2', 'study_sprint'] },
  { id: 'anx', a: ['calm', 'calm_landscape', 'thought_sort', 'emotion_map', 'video', 'mem'] },
  { id: 'ocd', a: ['calm', 'time'] },
  { id: 'mood', a: ['micro_start', 'start2', 'emotion_map', 'breakdown', 'calm', 'seq'] },
  { id: 'sleep', a: ['calm', 'calm_landscape', 'seq', 'time'] },
  { id: 'soc', a: ['seq', 'mem'] },
  { id: 'aut', a: ['seq', 'time', 'calm', 'calm_landscape'] },
  { id: 'gen', a: ['video', 'attention_scene', 'mem', 'calm', 'time', 'calm_landscape', 'emotion_map'] },
];

export const SHAPES: Record<string, string> = {
  circle: '<circle cx="12" cy="12" r="9"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="4"/>',
  tri: '<path d="M12 3l10 18H2z" stroke-linejoin="round"/>',
  star: '<path d="M12 2l3 7 7 .8-5.3 4.8L18.2 22 12 18l-6.2 4 1.5-7.4L2 9.8 9 9z"/>',
  heart: '<path d="M12 21C4 14 2 10 2 7a5 5 0 0110-1 5 5 0 0110 1c0 3-2 7-10 14z"/>',
  moon: '<path d="M20 14A9 9 0 1110 4a7 7 0 0010 10z"/>',
  drop: '<path d="M12 2s7 7 7 12a7 7 0 01-14 0c0-5 7-12 7-12z"/>',
  leaf: '<path d="M4 20C4 9 10 4 21 3c0 11-5 17-15 17z"/>',
};
export const COLORS = ['#FF8E83', '#FFD36E', '#8BCDF1', '#A78BFA', '#28785B', '#FFC6A8'];
// Color index to the stable name used in locale keys (games.colors.<name>).
export const COLOR_IDS = ['coral', 'yellow', 'sky', 'lavender', 'green', 'peach'];
