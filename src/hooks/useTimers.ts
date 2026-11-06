import { useCallback, useEffect, useMemo, useRef } from 'react';

interface Timer {
  fn: () => void;
  left: number;
  at: number;
  id: ReturnType<typeof setTimeout> | 0;
}

// Timeouts that pause with the game and are cancelled when it closes, so nothing fires after a skip or exit.
export function useTimers(paused = false) {
  const list = useRef<Timer[]>([]);
  const held = useRef(paused);

  const arm = useCallback((t: Timer) => {
    t.at = Date.now();
    t.id = setTimeout(() => {
      list.current = list.current.filter((x) => x !== t);
      t.fn();
    }, t.left);
  }, []);

  const after = useCallback((fn: () => void, ms: number) => {
    const t: Timer = { fn, left: ms, at: 0, id: 0 };
    list.current.push(t);
    if (!held.current) arm(t);
    return t;
  }, [arm]);

  const cancel = useCallback((t: Timer) => {
    if (t.id) clearTimeout(t.id);
    list.current = list.current.filter((x) => x !== t);
  }, []);

  const clear = useCallback(() => {
    list.current.forEach((t) => t.id && clearTimeout(t.id));
    list.current = [];
  }, []);

  useEffect(() => {
    held.current = paused;
    list.current.forEach((t) => {
      if (paused && t.id) {
        clearTimeout(t.id);
        t.id = 0;
        t.left = Math.max(0, t.left - (Date.now() - t.at));
      } else if (!paused && !t.id) {
        arm(t);
      }
    });
  }, [paused, arm]);

  useEffect(() => clear, [clear]);

  return useMemo(() => ({ after, cancel, clear }), [after, cancel, clear]);
}
