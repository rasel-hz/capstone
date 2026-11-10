// Shapes mirror the `kw2` localStorage document from the prototype, so saved data keeps working.
export type Gender = 'm' | 'f';
export type JourneyId = 'adhd' | 'anx' | 'ocd' | 'mood' | 'sleep' | 'soc' | 'aut' | 'gen';
export type ChallengeId =
  | 'video' | 'mem' | 'seq' | 'time' | 'calm' | 'start2'
  | 'attention_scene' | 'priority_board' | 'breakdown' | 'study_sprint' | 'emotion_map' | 'calm_landscape'
  | 'micro_start' | 'thought_sort'
  | 'dhikr_morning' | 'dhikr_evening' | 'dhikr_calm_heart' | 'dhikr_moment' | 'dhikr_sleep'
  | 'eye_break' | 'grounding';
export type ChallengeCategory = 'focus' | 'memory' | 'planning' | 'time' | 'relax' | 'real';
export type Difficulty = 'easy' | 'normal';
export type ContextTag = 'event' | 'work' | 'sleep';
export type EnergyLevel = 'high' | 'mid' | 'low';
export type ViewId = 'home' | 'journeys' | 'chal' | 'chat' | 'prog' | 'rew' | 'set' | 'path';

export type ItemStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'SKIPPED' | 'ABANDONED';
export type MissionStatus = 'IN_PROGRESS' | 'PAUSED' | 'DONE';

export interface Challenge {
  cat: ChallengeCategory;
  min: number;
  xp: number;
  k: string;
  /** Has a real easier version. */
  hasEasy: boolean;
  /** Produces a first-try accuracy score. Unscored challenges are never compared with scored ones. */
  scored: boolean;
  /** Self-report only: no XP and no achievements, and its results stay on the device (reference 14.2). */
  selfReport?: boolean;
  /** Ends without a sound, confetti or a cheering mascot, such as dhikr before sleep. */
  quiet?: boolean;
}

export interface Journey {
  id: JourneyId;
  a: ChallengeId[];
}

// A reason code, turned into text only when shown (planner.whyText). A plain string is an older saved reason.
export interface WhyPart {
  k: string;
  acc?: number;
  journey?: JourneyId;
  /** Minutes, for reasons such as "fits the 10 minutes you have". */
  n?: number;
}
export type Why = string | WhyPart[];

export interface PlannedItem {
  id: ChallengeId;
  why: Why;
  diff: Difficulty;
  /** The journey step this attempt belongs to, so only a real completion can mark it done. */
  jn?: string;
  /** Personal content for the game, validated before use. Without it a game shows its general example. */
  cfg?: import('../features/plan/config').PlanConfig;
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
  /** Position in the mission, which with mid makes the attempt key the server knows. Missing on older rows. */
  i?: number;
  /** Saved to Supabase. */
  sy?: 1;
}

export interface EnergyCheckin {
  d: string;
  e: EnergyLevel;
  ts: number;
}

/** An activity the companion suggested in chat. The user decides whether and when it starts. */
export interface ChatSuggestion {
  /** Approved challenge IDs, best first. */
  ids: ChallengeId[];
  /** Which one is showing, after "choose another". */
  i: number;
  /** The reason, grounded in what the user said. Written by the AI or taken from the locale files. */
  why?: string;
  /** Reason code used when there is no written reason, so it follows the language. */
  goal?: string;
  /** 'started' or 'dismissed' once answered, so an old card can't start anything. */
  st?: 'started' | 'dismissed';
  /** The user's own tasks for the planning board, when they mentioned any. */
  cfg?: import('../features/plan/config').PlanConfig;
  /** The user's tasks were added to today's goals. */
  goals?: 1;
}

export interface ChatMessage {
  t: string;
  b?: 1;
  card?: 1;
  sug?: ChatSuggestion;
}

/** Optional "was this helpful?" answer after an activity: 1 helpful, 0 somewhat, -1 not helpful. */
export interface Feedback {
  id: ChallengeId;
  v: 1 | 0 | -1;
  ts: number;
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
  /** City for calculated prayer times. Empty means the user enters the time by hand. */
  city: string;
  /** Larger text setting. */
  largeText: number;
  /** Interface language. */
  lang: 'ar-SA' | 'en';
  /** Self-reported helpfulness of activities, used to adapt suggestions. Stays on the device. */
  fb: Feedback[];
  /** Prayer-aware scheduling is on. The user can turn it off at any time. */
  prayerOn: number;
  /** Ask with a check-in during a prayer window. Off means no prompts at all. */
  prayerAsk: number;
  prayerMethod: import('../features/prayer/times').MethodId;
  /** Asr: 0 standard, 1 Hanafi. */
  prayerAsr: 0 | 1;
  /** A detected location, rounded to about 1 km, with its time zone. Null when a city or nothing is used. */
  loc: import('../features/prayer/times').PrayerPlace | null;
  /**
   * The answer to the check-in for one prayer window only. It is replaced by the next window's answer,
   * so no prayer history builds up. It is the user's own report, never a verified fact, and earns nothing.
   */
  prayerAck: { key: string; v: 'prayed' | 'later' | 'back' } | null;
  /** An optional break reminder. The timer is a personal reminder, not a measure of anything. */
  prayerBreak: PrayerBreak | null;
  /** The journey program in progress: one challenge a day for a set number of days. */
  prog: Program | null;
  /** Finished programs, with the user's own rating before and after. */
  progDone: ProgramResult[];
  /** Today's goals, in the user's words. Replaced when the day changes. */
  goals: DayGoals | null;
  /** The buddy's energy today, from 0 to ENERGY_FULL. Nothing takes it away; a new day starts fresh. */
  nrg: number;
  /** The day nrg belongs to. */
  nrgD: string;
  /** Days the energy filled up, as today() strings, newest last. Days that didn't fill aren't recorded at all. */
  fullDays: string[];
  /** Show a warm welcome back once after a long gap. */
  missed: number;
  /** What the user told us during onboarding. Self-reported, optional, and never a diagnosis. */
  prof: import('../features/profile/questions').LifeProfile | null;
  /** The personal journey. Only real completions mark its steps done. */
  path: import('../features/path/planner').PathPlan | null;
  /** Days the user chose to rest, as YYYY-MM-DD. */
  rest: string[];
  /** Streak days Supabase found in the account's completed challenges, as YYYY-MM-DD, so other devices count. */
  streakDays: string[];
  /** Show the streak. Off hides it everywhere. */
  streakOn: number;
  /** Protect one unplanned missed day in any 7. */
  streakGrace: number;
  /** The highest streak milestone already celebrated. */
  streakSeen: number;
  /** The Supabase account this saved data belongs to. Missing before an account is created. */
  uid?: string;
}

export interface Program {
  id: JourneyId;
  /** Days with that day's step done, as today() strings. Gaps don't matter; the next step simply waits. */
  days: string[];
  /** Self-rating from 1 to 5 at the start. */
  before: number;
  started: string;
}

export interface ProgramResult {
  id: JourneyId;
  before: number;
  after: number;
  end: string;
}

export interface Goal {
  id: string;
  /** Exactly as the user wrote it. */
  text: string;
  done: 0 | 1;
  /** Energy was already given for this goal, so ticking it again gives nothing more. */
  e?: 1;
}

export interface DayGoals {
  d: string;
  items: Goal[];
}

export interface PrayerBreak {
  /** The window it was started in, if any. */
  key: string;
  prayer: import('../features/prayer/times').PrayerId | null;
  /** When the reminder started, and its length. */
  start: number;
  mins: number;
  /** Milliseconds left, while the reminder is paused. */
  pausedLeft?: number;
}

export interface GameResult {
  acc: number | null;
  retries: number;
  say?: import('../i18n').Msg;
  mood?: import('../components/mascot/manifest').MascotState;
  note?: import('../i18n').Msg;
  data?: unknown;
}
