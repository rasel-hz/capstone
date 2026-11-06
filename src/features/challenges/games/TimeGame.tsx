import { useEffect, useRef, useState } from 'react';
import { useTimers } from '../../../hooks/useTimers';
import type { GameProps } from '../types';

export function TimeGame({ env, onDone }: GameProps) {
  const timers = useTimers(env.paused);
  const [est, setEst] = useState(0);
  const [phase, setPhase] = useState<'guess' | 'ready' | 'running' | 'stopped'>('guess');
  const elapsed = useRef(0);
  const since = useRef(0);

  useEffect(() => {
    env.say('curious', 'قدّر الوقت أول.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    if (env.paused) {
      if (since.current) elapsed.current += Date.now() - since.current;
      since.current = 0;
    } else if (!since.current) {
      since.current = Date.now();
    }
  }, [env.paused, phase]);

  function stop() {
    const a = (elapsed.current + (since.current ? Date.now() - since.current : 0)) / 1000;
    const err = Math.abs(est - a);
    const line = a > est ? `أخذت ${a.toFixed(1)} ثانية، أكثر من توقعك شوي. عادي، الوقت يجري بسرعة.` : `أخذت ${a.toFixed(1)} ثانية، أقل من توقعك. حلو التقدير.`;
    setPhase('stopped');
    env.sfx('ok');
    env.say('happy', line);
    timers.after(() => onDone({
      acc: null,
      retries: 0,
      say: line,
      note: `توقعك ${est} ثانية، والفعلي ${a.toFixed(1)} ثانية. الفرق ${err.toFixed(1)} ثانية.`,
      data: { est, act: +a.toFixed(1), err: +err.toFixed(1) },
    }), 2200);
  }

  if (phase === 'guess') {
    return (
      <div className="scene">
        <h2>كم ثانية تتوقع تاخذ منك: تعدّ بصوت واطي من ١ إلى ١٠؟</h2>
        {[5, 10, 15, 20].map((v) => (
          <button key={v} type="button" className="opt" onClick={() => { setEst(v); setPhase('ready'); }}>{v} ثانية</button>
        ))}
      </div>
    );
  }
  return (
    <div className="scene">
      <h2>توقعك {est} ثانية</h2>
      <p>اضغط ابدأ وعدّ من ١ إلى ١٠، وبعدها اضغط وقف.</p>
      {phase === 'ready' ? (
        <button type="button" className="btn" onClick={() => { since.current = Date.now(); setPhase('running'); env.say('thinking', 'أنا ساكت وأنت تعد...'); }}>ابدأ</button>
      ) : (
        <button type="button" className="btn" disabled={phase === 'stopped'} onClick={stop}>وقّف</button>
      )}
    </div>
  );
}
