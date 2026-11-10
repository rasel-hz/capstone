import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { playSound } from '../../animations/effects';
import { useAppSelector } from '../../context/AppStateContext';
import type { MascotState } from './manifest';
import type { MascotController } from './useMascot';

// Tapping Zaho: a reaction and a short line in a bubble, a different one each time.
const REACTIONS: MascotState[] = ['happy', 'curious', 'encouraging', 'greeting', 'celebrating'];
const LINES = 5;

/**
 * `area` picks the lines (mascot.poke.<area>.1 to 5). The first line can be a special one, such as waking up.
 * Returns what to call on a tap, and the line to show while it's up.
 */
export function usePoke(mascot: MascotController, area: string, first?: string) {
  const { t } = useTranslation();
  const snd = useAppSelector((s) => s.snd);
  const [line, setLine] = useState('');
  const n = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const poke = useCallback(() => {
    const i = n.current++;
    mascot.play(REACTIONS[i % REACTIONS.length]);
    playSound(!!snd, 'tap');
    setLine(i === 0 && first ? t(first) : t(`mascot.poke.${area}.${(i % LINES) + 1}`));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLine(''), 2200);
  }, [mascot, snd, area, first, t]);

  return { poke, line };
}

/** The line, as a small bubble above Zaho. Read out to screen readers too. */
export function PokeBubble({ line }: { line: string }) {
  return <span className={`poke-bubble ${line ? 'is-on' : ''}`} role="status" aria-live="polite">{line}</span>;
}
