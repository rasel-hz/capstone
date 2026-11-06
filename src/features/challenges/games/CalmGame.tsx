import { useEffect, useRef, useState } from 'react';
import { useTimers } from '../../../hooks/useTimers';
import type { GameProps } from '../types';

type Phase = 'ready' | 'in' | 'out' | 'ask';

export function CalmGame({ env, onDone }: GameProps) {
  const timers = useTimers(env.paused);
  const [phase, setPhase] = useState<Phase>('ready');
  const cycle = useRef(0);

  useEffect(() => {
    env.say('calm', 'على هونك. شهيق من الأنف وزفير من الفم.');
    const breatheIn = () => {
      setPhase('in');
      timers.after(() => {
        setPhase('out');
        timers.after(() => {
          cycle.current++;
          if (cycle.current < 3) breatheIn();
          else setPhase('ask');
        }, 4000);
      }, 4000);
    };
    const t = timers.after(breatheIn, 800);
    return () => timers.cancel(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'ask') {
    return (
      <div className="scene">
        <h2>كيف حسيت؟</h2>
        {[['y', 'ارتحت'], ['s', 'شوي'], ['n', 'ما فرق']].map(([k, l]) => (
          <button key={k} type="button" className="opt" onClick={() => { env.sfx('ok'); onDone({ acc: null, retries: 0, data: { help: k } }); }}>{l}</button>
        ))}
        <p className="note">إجابتك للمتابعة فقط.</p>
      </div>
    );
  }
  return (
    <div className="scene">
      <h2 aria-live="polite">{phase === 'in' ? 'شهيق...' : phase === 'out' ? 'زفير...' : 'استعد...'}</h2>
      <div key={phase + cycle.current} className={`br br--${phase}`} style={{ animationPlayState: env.paused ? 'paused' : 'running' }} />
      <p className="note">٣ مرات، وتقدر تتوقف بأي وقت.</p>
    </div>
  );
}
