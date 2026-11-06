import { useCallback, useEffect, useRef, useState } from 'react';
import { isOneShot, ONE_SHOT_MS, type MascotState } from './manifest';

export interface MascotController {
  state: MascotState;
  play(s: MascotState): void;
  /** Ends any reaction right away, for example so nothing cheerful plays over a serious reply. */
  clear(): void;
}

// `base` comes from real app state. `play` layers a one-time reaction on top, then falls back to it.
// A repeat of the reaction already playing is ignored, so rapid events can't restart it.
export function useMascot(base: MascotState = 'idle'): MascotController {
  const [shot, setShot] = useState<MascotState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const playing = useRef<MascotState | null>(null);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    playing.current = null;
    setShot(null);
  }, []);

  const play = useCallback((s: MascotState) => {
    if (!isOneShot(s) || playing.current === s) return;
    clearTimeout(timer.current);
    playing.current = s;
    setShot(s);
    timer.current = setTimeout(clear, ONE_SHOT_MS[s]);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { state: shot ?? base, play, clear };
}
