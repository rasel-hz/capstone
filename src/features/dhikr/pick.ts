import type { ChallengeId } from '../../types/index.ts';
import type { Goal } from '../recommend/goals.ts';
import { dhikrFitsNow, isDhikr, type DhikrId } from './content.ts';

// Which of the five dhikr challenges fits now, from the user's own clock (the device's local time) and
// what they are dealing with. Selection only: the texts, sources and counts are never touched here.

const TIMED: DhikrId[] = ['dhikr_morning', 'dhikr_evening', 'dhikr_sleep'];

/**
 * The dhikr to offer when one is wanted but not named. Getting ready for sleep gets the bedtime dhikr in
 * its hours; worry or stress gets "calm your heart"; otherwise the time of day decides, and outside the
 * morning, evening and bedtime hours it is a short moment of dhikr.
 */
export function pickDhikr(now = new Date(), need?: Goal | 'sleep_now' | null): DhikrId {
  if ((need === 'sleep' || need === 'sleep_now') && dhikrFitsNow('dhikr_sleep', now)) return 'dhikr_sleep';
  if (need === 'stress' || need === 'worry') return 'dhikr_calm_heart';
  if (dhikrFitsNow('dhikr_morning', now)) return 'dhikr_morning';
  if (dhikrFitsNow('dhikr_evening', now)) return 'dhikr_evening';
  if (dhikrFitsNow('dhikr_sleep', now)) return 'dhikr_sleep';
  return 'dhikr_moment';
}

/**
 * The challenge a journey step really opens now. A morning, evening or bedtime dhikr saved earlier becomes
 * the one that fits the current time when it is opened; the saved journey itself is not rewritten.
 */
export function effectiveId(id: ChallengeId, now = new Date()): ChallengeId {
  if (!isDhikr(id) || !TIMED.includes(id) || dhikrFitsNow(id, now)) return id;
  return pickDhikr(now);
}
