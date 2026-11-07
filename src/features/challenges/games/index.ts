import type { ComponentType } from 'react';
import type { ChallengeId } from '../../../types';
import type { GameProps } from '../types';
import { AttentionSceneGame } from './AttentionSceneGame';
import { BreakdownGame } from './BreakdownGame';
import { CalmGame } from './CalmGame';
import { CalmLandscapeGame } from './CalmLandscapeGame';
import { EmotionMapGame } from './EmotionMapGame';
import { MemoryGame } from './MemoryGame';
import { MicroStartGame } from './MicroStartGame';
import { ThoughtSortGame } from './ThoughtSortGame';
import { PriorityBoardGame } from './PriorityBoardGame';
import { SequenceGame } from './SequenceGame';
import { StartGame } from './StartGame';
import { StudySprintGame } from './StudySprintGame';
import { TimeGame } from './TimeGame';
import { VideoGame } from './VideoGame';

export const GAMES: Record<ChallengeId, ComponentType<GameProps>> = {
  video: VideoGame,
  mem: MemoryGame,
  seq: SequenceGame,
  time: TimeGame,
  calm: CalmGame,
  start2: StartGame,
  attention_scene: AttentionSceneGame,
  priority_board: PriorityBoardGame,
  breakdown: BreakdownGame,
  study_sprint: StudySprintGame,
  emotion_map: EmotionMapGame,
  calm_landscape: CalmLandscapeGame,
  micro_start: MicroStartGame,
  thought_sort: ThoughtSortGame,
};

export { MemoryGame };
