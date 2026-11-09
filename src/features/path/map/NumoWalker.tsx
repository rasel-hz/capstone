import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { Mascot } from '../../../components/mascot/Mascot';
import type { MascotState } from '../../../components/mascot/manifest';
import { routePoints, WORLD_W, type Stop } from '../world';
import { WALK_MS } from './useJourneyTravel';

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * Numo, standing on the stop saved progress says is current. There is no walking clip, so travel is the
 * standing pose moving along the route with a small step, which never distorts the character.
 * Only this one clip plays on the map.
 */
export function NumoWalker({ stop, height, mood, label, reduced }: { stop: Stop; height: number; mood: MascotState; label: string; reduced: boolean }) {
  const prev = useRef(stop);
  // Worked out once per move, so another render during the walk can't interrupt it.
  const pts = useMemo(() => (prev.current.key !== stop.key && !reduced ? routePoints(prev.current, stop) : null), [stop, reduced]);
  useEffect(() => { prev.current = stop; }, [stop]);

  return (
    <motion.div
      className="jw__numo"
      initial={false}
      animate={{ left: pts ? pts.map((p) => pct(p.x, WORLD_W)) : pct(stop.x, WORLD_W), top: pts ? pts.map((p) => pct(p.y, height)) : pct(stop.y, height) }}
      transition={pts ? { duration: WALK_MS / 1000, ease: 'easeInOut' } : { duration: 0 }}
    >
      <motion.div className="jw__numo-in" key={stop.key} animate={pts ? { y: [0, -7, 0, -7, 0, -7, 0] } : undefined} transition={{ duration: WALK_MS / 1000 }}>
        <Mascot state={mood} size={92} label={label} />
      </motion.div>
    </motion.div>
  );
}
