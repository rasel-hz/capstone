export type MascotState =
  | 'idle' | 'greeting' | 'listening' | 'thinking' | 'happy' | 'celebrating'
  | 'encouraging' | 'curious' | 'calm' | 'resting' | 'concerned';

const base = import.meta.env.BASE_URL;

export const BASE_IMAGE = `${base}mascot/base/pose-main.png`;

// Add a generated file here and the app uses it for that state. Nothing else needs to change.
// Clips must start and end on the base pose, so switching between states doesn't jump.
export const CLIPS: Partial<Record<MascotState, { src: string }>> = {
  idle: { src: `${base}mascot/animations/idle.webm` },
};
export const EXPRESSIONS: Partial<Record<MascotState, string>> = {};

// States that play once and return to the screen's base state. The rest hold until the app changes them.
export const ONE_SHOT_MS: Partial<Record<MascotState, number>> = {
  greeting: 1400,
  happy: 1000,
  celebrating: 1600,
  encouraging: 900,
  curious: 800,
};

export const isOneShot = (s: MascotState) => s in ONE_SHOT_MS;

export const SIZES = { small: 56, medium: 110, large: 190 } as const;
export type MascotSize = keyof typeof SIZES | number;
