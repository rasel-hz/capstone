import type { ComponentType } from 'react';
import type { ChallengeId } from '../../../types';
import type { GameProps } from '../types';
import { CalmGame } from './CalmGame';
import { MemoryGame } from './MemoryGame';
import { SequenceGame } from './SequenceGame';
import { StartGame } from './StartGame';
import { TimeGame } from './TimeGame';
import { VideoGame } from './VideoGame';

export const GAMES: Record<ChallengeId, ComponentType<GameProps>> = {
  video: VideoGame,
  mem: MemoryGame,
  seq: SequenceGame,
  time: TimeGame,
  calm: CalmGame,
  start2: StartGame,
};

export { MemoryGame };
