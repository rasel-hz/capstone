export type MascotState =
  | 'idle' | 'greeting' | 'listening' | 'thinking' | 'happy' | 'celebrating'
  | 'encouraging' | 'curious' | 'calm' | 'resting' | 'concerned';

const base = import.meta.env.BASE_URL;

export const BASE_IMAGE = `${base}mascot/base/pose-main.png`;

// Add a generated file here and the app uses it for that state. Nothing else needs to change.
// Clips must start and end on the base pose, so switching between states doesn't jump.
const clip = (s: MascotState) => ({ src: `${base}mascot/animations/${s}.webm` });
export const CLIPS: Partial<Record<MascotState, { src: string }>> = {
  idle: clip('idle'), greeting: clip('greeting'), listening: clip('listening'), thinking: clip('thinking'), happy: clip('happy'), celebrating: clip('celebrating'),
  encouraging: clip('encouraging'), curious: clip('curious'), calm: clip('calm'), resting: clip('resting'), concerned: clip('concerned'),
};

// Fetches clips into the browser cache once the page is idle, so the first reaction plays straight away.
// Skipped when the clips won't play anyway, or when someone has asked to save data.
export function preloadClips() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const run = () => Object.values(CLIPS).forEach((c) => { void fetch(c!.src, { priority: 'low' } as RequestInit).catch(() => {}); });
  if ('requestIdleCallback' in window) requestIdleCallback(run);
  else setTimeout(run, 1500);
}
export const EXPRESSIONS: Partial<Record<MascotState, string>> = {};

// States that play once and return to the screen's base state. The rest hold until the app changes them.
// Each value matches the length of that state's clip.
export const ONE_SHOT_MS: Partial<Record<MascotState, number>> = {
  greeting: 3040,
  happy: 3040,
  celebrating: 3040,
  encouraging: 3040,
  curious: 3040,
};

export const isOneShot = (s: MascotState) => s in ONE_SHOT_MS;

export const SIZES = { small: 56, medium: 110, large: 190 } as const;
export type MascotSize = keyof typeof SIZES | number;
