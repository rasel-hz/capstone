import { useEffect, useState } from 'react';
import type { MascotState } from '../../../components/mascot/manifest';
import { fireConfetti, prefersReduced } from '../../../animations/effects';
import type { Store } from '../../../context/AppStateContext';
import type { PathPlan } from '../planner';
import { pendingArrival, standKey } from '../world';

export const CHEER_MS = 2400;
export const WALK_MS = 1500;

type Run = { from: string; to: string | null; phase: 'cheer' | 'walk' };

/**
 * Plays a finished step's celebration once, then moves Numo to the next step. Progress is already saved
 * by the time this runs; the animation never advances anything. The celebration is marked as seen when
 * it starts, so a refresh or a return can't replay it.
 */
export function useJourneyTravel(plan: PathPlan, store: Store, covered: boolean, rm: boolean) {
  const [run, setRun] = useState<Run | null>(null);
  const reduced = rm || prefersReduced();
  const pending = covered ? null : pendingArrival(plan);

  useEffect(() => {
    if (!pending || run) return;
    setRun({ from: pending.from, to: pending.to, phase: 'cheer' });
    if (pending.milestone) fireConfetti(rm);
    store.update((d) => { if (d.path) d.path.seen = pending.from; });
  }, [pending, run, store, rm]);

  useEffect(() => {
    if (!run) return;
    const next = () => {
      if (run.phase === 'cheer' && run.to && !reduced) setRun({ ...run, phase: 'walk' });
      else setRun(null);
    };
    const id = setTimeout(next, run.phase === 'cheer' ? (reduced ? 1200 : CHEER_MS) : WALK_MS);
    return () => clearTimeout(id);
  }, [run, reduced]);

  const stand = run ? (run.phase === 'cheer' ? run.from : run.to ?? run.from) : standKey(plan);
  const mood: MascotState = run?.phase === 'cheer' ? 'celebrating' : 'idle';
  return { run, stand, mood, reduced };
}
