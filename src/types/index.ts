// Shapes mirror the `kw2` localStorage document from the prototype, so saved data keeps working.
export type Gender = 'm' | 'f';
export type JourneyId = 'adhd' | 'anx' | 'ocd' | 'mood' | 'sleep' | 'soc' | 'aut' | 'gen';
export type ChallengeId =
  | 'video' | 'mem' | 'seq' | 'time' | 'calm' | 'start2'
  | 'attention_scene' | 'priority_board' | 'breakdown' | 'study_sprint' | 'emotion_map' | 'calm_landscape';
export type ChallengeCategory = 'تركيز' | 'ذاكرة' | 'تخطيط' | 'وعي بالوقت' | 'استرخاء' | 'مهمة حقيقية';
export type Difficulty = 'easy' | 'normal';
export type ContextTag = 'event' | 'work' | 'sleep';
export type EnergyLevel = 'high' | 'mid' | 'low';
export type ViewId = 'home' | 'journeys' | 'chal' | 'chat' | 'prog' | 'rew' | 'set';

export type ItemStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'SKIPPED' | 'ABANDONED';
export type MissionStatus = 'IN_PROGRESS' | 'PAUSED' | 'DONE';

export interface Challenge {
  t: string;
  cat: ChallengeCategory;
  min: number;
  xp: number;
  k: string;
  /** One line for cards. */
  desc: string;
  /** Why someone might pick it. Never a health claim. */
  purpose: string;
  /** Has a real easier version. */
  hasEasy: boolean;
  /** Produces a first-try accuracy score. Unscored challenges are never compared with scored ones. */
  scored: boolean;
  /** Self-report only: no XP and no achievements, and its results stay on the device (reference 14.2). */
  selfReport?: boolean;
}

export interface Journey {
  id: JourneyId;
  n: string;
  a: ChallengeId[];
  d: string;
  g: string;
}

export interface PlannedItem {
  id: ChallengeId;
  why: string;
  diff: Difficulty;
}

export interface MissionItem extends PlannedItem {
  status: ItemStatus;
  retries: number;
  xp: number;
  acc: number | null;
  start?: number;
  end?: number;
  paused?: number;
  pauseAt?: number;
  data?: unknown;
}

export interface Mission {
  id: string;
  solo: boolean;
  items: MissionItem[];
  idx: number;
  status: MissionStatus;
  started: number;
  xp?: number;
}

export interface Attempt {
  mid: string;
  id: ChallengeId;
  status: ItemStatus;
  acc: number | null;
  retries: number;
  xp: number;
  dur: number;
  d: string;
  ts: number;
  data?: unknown;
}

export interface EnergyCheckin {
  d: string;
  e: EnergyLevel;
  ts: number;
}

export interface ChatMessage {
  t: string;
  b?: 1;
  card?: 1;
}

export interface PendingContext {
  ctx: ContextTag[];
  low: number;
}

export interface AppState {
  started: number;
  done: number;
  name: string;
  g: Gender;
  needs: JourneyId[];
  sched: string;
  pat: string;
  sleep: string;
  pp: number;
  prayer: string;
  snd: number;
  rm: number;
  notif: number;
  ctx: ContextTag[];
  pend: PendingContext | null;
  hist: Attempt[];
  en: EnergyCheckin[];
  xp: number;
  view: ViewId;
  chat: ChatMessage[];
  mission: Mission | null;
  pref: string | null;
  drive: number;
  driving: number;
  last: number;
  theme: string;
  comeback: number;
  lastDaily: { d: string; all: boolean } | null;
  /** Consent to send chat to the AI service. null means not asked yet. */
  aiConsent: number | null;
  /** The day the manual prayer time was entered, so a stale time doesn't apply tomorrow. */
  prayerDay: string;
  /** Larger text setting. */
  largeText: number;
}

export interface GameResult {
  acc: number | null;
  retries: number;
  say?: string;
  mood?: import('../components/mascot/manifest').MascotState;
  note?: string;
  data?: unknown;
}
