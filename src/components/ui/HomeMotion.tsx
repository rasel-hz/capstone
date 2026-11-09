import type { ReactNode } from 'react';
import { useAppSelector } from '../../context/AppStateContext';
import AnimatedContent from '../reactbits/AnimatedContent';
import BlurText from '../reactbits/BlurText';

// Small, calm motion for Home. Every piece steps aside when the user turns on reduced motion in the app;
// the React Bits components also follow the device setting on their own.
const useCalm = () => !!useAppSelector((s) => s.rm);

/** A section that rises gently into view as it's scrolled to, once. */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  if (useCalm()) return <>{children}</>;
  return <AnimatedContent distance={24} duration={0.6} ease="power2.out" delay={delay} threshold={0.05}>{children}</AnimatedContent>;
}

/** Text that settles in word by word. Words, never letters, so Arabic letters stay joined. */
export function SettleText({ text }: { text: string }) {
  if (useCalm()) return <>{text}</>;
  return <BlurText text={text} animateBy="words" direction="top" delay={90} blur={8} distance={14} trigger="load" />;
}
