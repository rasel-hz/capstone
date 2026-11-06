import type { SoundKey } from '../features/challenges/types';

const prefersReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function fireConfetti(reducedSetting: boolean) {
  if (reducedSetting || prefersReduced()) return;
  const colors = ['#FF8E83', '#FFD36E', '#8BCDF1', '#A78BFA', '#8DBFA3'];
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('span');
    s.className = 'cf';
    s.style.background = colors[i % 5];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDelay = Math.random() * 0.9 + 's';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 4000);
  }
}

let audio: AudioContext | undefined;
const TONES: Record<SoundKey, number[]> = { ok: [660, 880], bad: [320], fin: [523, 659, 784], tap: [500] };

export function playSound(enabled: boolean, k: SoundKey) {
  if (!enabled) return;
  try {
    audio = audio || new AudioContext();
    const ctx = audio;
    TONES[k].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.15);
    });
  } catch {
    // Sound is optional and never needed to understand a result.
  }
}
