import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimers } from '../../../hooks/useTimers';
import { OasisBackdrop } from '../ChallengeArt';
import type { GameProps } from '../types';

type Phase = 'setup' | 'ready' | 'in' | 'top' | 'out' | 'quiet' | 'ask';
type Method = 'sigh' | 'long' | 'even';
// Each method as its breaths, in seconds. The sigh is two breaths in, the second a short top-up, then a long breath out.
const METHODS: Record<Method, { p: 'in' | 'top' | 'out'; sec: number }[]> = {
  sigh: [{ p: 'in', sec: 2 }, { p: 'top', sec: 1 }, { p: 'out', sec: 6 }],
  long: [{ p: 'in', sec: 4 }, { p: 'out', sec: 6 }],
  even: [{ p: 'in', sec: 5 }, { p: 'out', sec: 5 }],
};
const METHOD_IDS: Method[] = ['sigh', 'long', 'even'];
const MINUTES = [1, 3, 5];

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
  const { t } = useTranslation();
  const timers = useTimers(env.paused);
  const [phase, setPhase] = useState<Phase>('setup');
  const [method, setMethod] = useState<Method>('long');
  const [minutes, setMinutes] = useState(1);
  const [sound, setSound] = useState(false);
  const [mode, setMode] = useState<'breath' | 'quiet'>('breath');
  const [count, setCount] = useState(0);
  const [cycleNo, setCycleNo] = useState(1);
  const [len, setLen] = useState(4);
  const cycle = useRef(0);
  const steps = METHODS[method];
  const cycles = Math.max(1, Math.round((minutes * 60) / steps.reduce((n, x) => n + x.sec, 0)));

  useEffect(() => {
    env.say('calm', 'games.calm.intro');
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
    env.say('calm', `games.calm.guide.${method}`);
    cycle.current = 0;
    const play = (i: number) => {
      if (i === 0) setCycleNo(cycle.current + 1);
      const st = steps[i];
      setPhase(st.p);
      setLen(st.sec);
      if (sound) tone(st.p === 'out' ? 294 : 392);
      timers.after(() => {
        if (i + 1 < steps.length) return play(i + 1);
        cycle.current++;
        if (cycle.current < cycles) play(0);
        else setPhase('ask');
      }, st.sec * 1000);
    };
    timers.after(() => play(0), 800);
  }

  function beginQuiet() {
    setMode('quiet');
    setCount(minutes * 60);
    setPhase('quiet');
    env.say('calm', 'games.calm.quietGuide');
  }

  function answer(help: string | null) {
    env.sfx('ok');
    onDone({ acc: null, retries: 0, say: 'games.calm.done', mood: 'calm', data: { help, mode, method: mode === 'breath' ? method : null, minutes } });
  }

  if (phase === 'setup') {
    return (
      <div className="scene calm-set">
        <div className="calm-set__art"><OasisBackdrop /></div>
        <h2 className="q__t">{t('games.calm.how')}</h2>
        <h3>{t('games.calm.lengthQ')}</h3>
        <div className="row row--c" role="group" aria-label={t('games.calm.lengthQ')}>
          {MINUTES.map((m) => (
            <button key={m} type="button" className={`pace ${minutes === m ? 'on' : ''}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}><b>{t('common.minutes', { count: m })}</b></button>
          ))}
        </div>
        <h3>{t('games.calm.methodQ')}</h3>
        <div className="row row--c row--wrap" role="group" aria-label={t('games.calm.methodQ')}>
          {METHOD_IDS.map((m) => (
            <button key={m} type="button" className={`pace ${method === m ? 'on' : ''}`} aria-pressed={method === m} onClick={() => setMethod(m)}><b>{t(`games.calm.methods.${m}.name`)}</b><span>{t(`games.calm.methods.${m}.note`)}</span></button>
          ))}
        </div>
        {env.snd && (
          <label className="check center"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> {t('games.calm.tone')}</label>
        )}
        <div className="row row--c">
          <button type="button" className="btn" onClick={beginBreath}>{t('games.calm.startBreathing')}</button>
          <button type="button" className="btn alt" onClick={beginQuiet}>{t('games.calm.noBreathing')}</button>
        </div>
      </div>
    );
  }

  if (phase === 'ask') {
    return (
      <div className="scene q">
        <h2 className="q__t">{t('games.calm.feel')}</h2>
        <div className="choices choices--3">
          {['y', 's', 'n'].map((k) => <button key={k} type="button" className="opt" onClick={() => answer(k)}>{t(`games.common.help.${k}`)}</button>)}
        </div>
        <div className="row row--c"><button type="button" className="btn-link" onClick={() => answer(null)}>{t('games.common.preferNot')}</button></div>
      </div>
    );
  }

  return (
    <div className="calm">
      <OasisBackdrop dusk={phase === 'quiet'} className="calm__bg" />
      <div className="calm__fg">
        {phase !== 'quiet' && (
          <div
            key={phase + cycleNo}
            className={`br br--${phase} ${method === 'sigh' && phase === 'in' ? 'br--part' : ''}`}
            style={{ animationDuration: `${len}s`, animationPlayState: env.paused ? 'paused' : 'running' }}
            aria-hidden="true"
          />
        )}
        <p className="calm__t" aria-live="polite">{t(`games.calm.phases.${phase}`)}</p>
        <p className="calm__s">{phase === 'quiet' ? t('games.calm.left', { time: t('common.seconds', { count }) }) : t('games.calm.breathOf', { n: cycleNo, total: cycles })}</p>
      </div>
    </div>
  );
}
