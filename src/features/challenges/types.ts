import type { MascotState } from '../../components/mascot/manifest';
import type { Difficulty, Gender, GameResult } from '../../types';

export type SoundKey = 'ok' | 'bad' | 'fin' | 'tap';

export interface GameEnv {
  paused: boolean;
  g: Gender;
  hasEvent: boolean;
  say(mood: MascotState, text?: string): void;
  sfx(k: SoundKey): void;
}

// Every game has this shape, so a new challenge only needs to implement it and register in games/index.ts.
export interface GameProps {
  diff: Difficulty;
  env: GameEnv;
  onDone(r: GameResult): void;
}
