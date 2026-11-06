import type { AppState, Gender } from '../types';

export const today = () => new Date().toDateString();
export const level = (s: Pick<AppState, 'xp'>) => Math.floor(s.xp / 100) + 1;
export const byGender = (g: Gender, m: string, f: string) => (g === 'f' ? f : m);
export const shuffled = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);
export const clock = (sec: number) => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
