import { useEffect, useRef, useState } from 'react';
import { useTimers } from '../../../hooks/useTimers';
import { OasisBackdrop } from '../ChallengeArt';
import type { GameProps } from '../types';

type Phase = 'setup' | 'ready' | 'in' | 'out' | 'quiet' | 'ask';
const PACES: { sec: number; label: string; note: string }[] = [
  { sec: 3, label: 'أسرع', note: '٣ ثواني' },
  { sec: 4, label: 'عادي', note: '٤ ثواني' },
  { sec: 5, label: 'أبطأ', note: '٥ ثواني' },
];
const CYCLES = 3;
const QUIET_SEC = 30;

// A soft tone at the start of each breath, only if the user turned it on here.
function tone(freq: number) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.4);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 1.5);
    o.onended = () => void ctx.close();
  } catch {
    // Sound is optional.
  }
}

export function CalmGame({ env, onDone }: GameProps) {
  const timers = useTimers(env.paused);
  const [phase, setPhase] = useState<Phase>('setup');
  const [pace, setPace] = useState(4);
  const [sound, setSound] = useState(false);
  const [mode, setMode] = useState<'breath' | 'quiet'>('breath');
  const [count, setCount] = useState(0);
  const [cycleNo, setCycleNo] = useState(1);
  const cycle = useRef(0);

  useEffect(() => {
    env.say('calm', 'على هونك. اختر اللي يناسبك، وتقدر توقف بأي وقت.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'quiet' || env.paused) return;
    const iv = setInterval(() => setCount((c) => {
      if (c <= 1) {
        clearInterval(iv);
        setPhase('ask');
        return 0;
      }
      return c - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [phase, env.paused]);

  function beginBreath() {
    setMode('breath');
    setPhase('ready');
    env.say('calm', 'شهيق من الأنف، وزفير من الفم.');
    const ms = pace * 1000;
    const breatheIn = () => {
      setPhase('in');
      setCycleNo(cycle.current + 1);
      if (sound) tone(392);
      timers.after(() => {
        setPhase('out');
        if (sound) tone(294);
        timers.after(() => {
          cycle.current++;
          if (cycle.current < CYCLES) breatheIn();
          else setPhase('ask');
        }, ms);
      }, ms);
    };
    timers.after(breatheIn, 800);
  }

  function beginQuiet() {
    setMode('quiet');
    setCount(QUIET_SEC);
    setPhase('quiet');
    env.say('calm', 'بدون تنفس موجّه. بس خذ لك نص دقيقة هدوء.');
  }

  function answer(help: string | null) {
    env.sfx('ok');
    onDone({ acc: null, retries: 0, say: 'خذتها على هونك.', mood: 'calm', data: { help, mode, pace: mode === 'breath' ? pace : null } });
  }

  if (phase === 'setup') {
    return (
      <div className="scene calm-set">
        <div className="calm-set__art"><OasisBackdrop /></div>
        <h2 className="q__t">كيف تبيها اليوم؟</h2>
        <h3>سرعة التنفس</h3>
        <div className="row row--c" role="group" aria-label="سرعة التنفس">
          {PACES.map((p) => (
            <button key={p.sec} type="button" className={`pace ${pace === p.sec ? 'on' : ''}`} aria-pressed={pace === p.sec} onClick={() => setPace(p.sec)}><b>{p.label}</b><span>{p.note}</span></button>
          ))}
        </div>
        {env.snd && (
          <label className="check center"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> نغمة ناعمة مع كل نفس</label>
        )}
        <div className="row row--c">
          <button type="button" className="btn" onClick={beginBreath}>ابدأ التنفس</button>
          <button type="button" className="btn alt" onClick={beginQuiet}>ما أحب تمارين التنفس</button>
        </div>
        <p className="note center">تمرين للاسترخاء، وما نوعد بنتيجة معينة. إذا ضايقك وقّفه من فوق.</p>
      </div>
    );
  }

  if (phase === 'ask') {
    return (
      <div className="scene q">
        <h2 className="q__t">كيف حسيت؟</h2>
        <div className="choices choices--3">
          {[['y', 'ارتحت'], ['s', 'شوي'], ['n', 'ما فرق']].map(([k, l]) => (
            <button key={k} type="button" className="opt" onClick={() => answer(k)}>{l}</button>
          ))}
        </div>
        <div className="row row--c"><button type="button" className="btn-link" onClick={() => answer(null)}>أفضّل ما أجاوب</button></div>
        <p className="note center">إجابتك للمتابعة فقط، وكلها مقبولة.</p>
      </div>
    );
  }

  const label = phase === 'in' ? 'شهيق' : phase === 'out' ? 'زفير' : phase === 'quiet' ? 'هدوء' : 'استعد';
  return (
    <div className="calm">
      <OasisBackdrop dusk={phase === 'quiet'} className="calm__bg" />
      <div className="calm__fg">
        {phase !== 'quiet' && (
          <div
            key={phase + cycleNo}
            className={`br br--${phase}`}
            style={{ animationDuration: `${pace}s`, animationPlayState: env.paused ? 'paused' : 'running' }}
            aria-hidden="true"
          />
        )}
        <p className="calm__t" aria-live="polite">{label}</p>
        <p className="calm__s">{phase === 'quiet' ? `باقي ${count} ثانية` : `النفس ${cycleNo} من ${CYCLES}`}</p>
      </div>
    </div>
  );
}
