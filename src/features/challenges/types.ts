import type { MascotState } from '../../components/mascot/manifest';
import type { Msg } from '../../i18n';
import type { Difficulty, Gender, GameResult } from '../../types';

export type SoundKey = 'ok' | 'bad' | 'fin' | 'tap';

export interface GameEnv {
  paused: boolean;
  g: Gender;
  hasEvent: boolean;
  /** The user's stated schedule: work, study or flex. */
  sched: string;
  /** Reduced motion, from the app setting or the system. */
  rm: boolean;
  /** Sound is allowed by the user's setting. */
  snd: boolean;
  /** Takes a translation key or a function, never finished text, so it follows a language switch. */
  say(mood: MascotState, text?: Msg): void;
  sfx(k: SoundKey): void;
  /** Reports "round 1 of 3" to the shared header. The label is a translation key. */
  round(current: number, total: number, label?: string): void;
}

// Every game has this shape, so a new challenge only needs to implement it and register in games/index.ts.
// Keep stable IDs in game state and look up text when rendering, so switching language can't reset a game.
export interface GameProps {
  diff: Difficulty;
  env: GameEnv;
  onDone(r: GameResult): void;
}
