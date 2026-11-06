import { useEffect, useRef, useState } from 'react';
import { useTimers } from '../../../hooks/useTimers';
import { byGender, shuffled } from '../../../utils';
import { COLOR_NAMES, COLORS, SHAPES } from '../catalog';
import type { GameProps } from '../types';

const makeRound = (n: number) => {
  const keys = shuffled(Object.keys(SHAPES)).slice(0, n);
  const cols = shuffled([0, 1, 2, 3, 4, 5]);
  return { items: keys.map((k, i) => ({ k, c: cols[i] })), miss: Math.floor(Math.random() * n) };
};

const Shape = ({ k, c, s }: { k: string; c: number; s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={COLORS[c]} stroke="rgba(38,61,55,.25)" dangerouslySetInnerHTML={{ __html: SHAPES[k] }} />
);

export function MemoryGame({ diff, env, onDone }: GameProps) {
  const easy = diff === 'easy';
  const n = easy ? 4 : 5;
  const rounds = easy ? 1 : 2;
  const timers = useTimers(env.paused);
  const [round, setRound] = useState(() => makeRound(n));
  const [phase, setPhase] = useState<'show' | 'ask'>('show');
  const [bad, setBad] = useState<number[]>([]);
  const [ok, setOk] = useState<number | null>(null);
  const firstTry = useRef(0);
  const tries = useRef(0);
  const wrong = useRef(0);
  const played = useRef(0);

  useEffect(() => {
    setPhase('show');
    setBad([]);
    setOk(null);
    wrong.current = 0;
    env.say('curious', 'ركّز، عندك ٥ ثواني.');
    const t = timers.after(() => {
      setPhase('ask');
      env.say('listening', 'وش اختفى؟');
    }, 5200);
    return () => timers.cancel(t);
    // Runs once per round. env.say and timers are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function choose(i: number) {
    if (ok != null) return;
    if (i === round.miss) {
      setOk(i);
      env.sfx('ok');
      if (!wrong.current) firstTry.current++;
      env.say('happy', wrong.current ? 'قربت وجبتها! كذا.' : byGender(env.g, 'يا سلام عليك! والله إنك كفو!', 'يا سلام عليك! والله إنك كفو!'));
      timers.after(() => {
        played.current++;
        if (played.current < rounds) setRound(makeRound(n));
        else onDone({ acc: Math.round((firstTry.current / rounds) * 100), retries: tries.current });
      }, 1300);
      return;
    }
    wrong.current++;
    tries.current++;
    setBad((b) => [...b, i]);
    env.sfx('bad');
    const color = COLOR_NAMES[round.items[round.miss].c];
    env.say('encouraging', wrong.current > 1 ? 'عوافي، نغير الطريقة شوي. كان لونه ' + color : 'قربت! تلميح: لونه ' + color);
    if (wrong.current >= 3) choose(round.miss);
  }

  if (phase === 'show') {
    return (
      <div className="scene">
        <h2>احفظ الأشكال وألوانها</h2>
        <div className="shapes">{round.items.map((x) => <Shape key={x.k} k={x.k} c={x.c} s={64} />)}</div>
        <div className="bar"><i key={String(round.miss) + played.current} className="bar-drain" style={{ animationDuration: '5s', animationPlayState: env.paused ? 'paused' : 'running' }} /></div>
      </div>
    );
  }
  return (
    <div className="scene">
      <h2>وش اختفى؟</h2>
      <div className="shapes">
        {round.items.map((x, i) => (i === round.miss ? <div key={x.k} className="gap">؟</div> : <Shape key={x.k} k={x.k} c={x.c} s={64} />))}
      </div>
      <p>اختر الشكل اللي كان مكان الفراغ</p>
      <div className="shapes">
        {round.items.map((x, i) => (
          <button
            key={x.k}
            type="button"
            className={`opt opt--icon ${ok === i ? 'ok' : ''} ${bad.includes(i) ? 'no' : ''}`}
            disabled={ok != null || bad.includes(i)}
            aria-label={`الخيار ${i + 1}: ${COLOR_NAMES[x.c]}`}
            onClick={() => choose(i)}
          >
            <Shape k={x.k} c={x.c} s={48} />
          </button>
        ))}
      </div>
    </div>
  );
}
