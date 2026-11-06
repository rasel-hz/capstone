import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useAppSelector } from '../context/AppStateContext';

// Animates a verified number from zero. The value itself always comes from saved results.
export function useCountUp(value: number, ms = 600): number {
  const rm = useAppSelector((s) => s.rm);
  const sys = useReducedMotion();
  const skip = !!rm || !!sys;
  const [shown, setShown] = useState(skip ? value : 0);

  useEffect(() => {
    if (skip) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, skip]);

  return shown;
}
