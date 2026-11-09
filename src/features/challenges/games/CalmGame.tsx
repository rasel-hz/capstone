import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimers } from '../../../hooks/useTimers';
import { OasisBackdrop } from '../ChallengeArt';
import type { GameProps } from '../types';

type Phase = 'setup' | 'ready' | 'in' | 'out' | 'quiet' | 'ask';
const PACES: { sec: number; id: string }[] = [{ sec: 3, id: 'fast' }, { sec: 4, id: 'normal' }, { sec: 5, id: 'slow' }];
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
  const { t } = useTranslation();
  const timers = useTimers(env.paused);
  const [phase, setPhase] = useState<Phase>('setup');
  const [pace, setPace] = useState(4);
  const [sound, setSound] = useState(false);
  const [mode, setMode] = useState<'breath' | 'quiet'>('breath');
  const [count, setCount] = useState(0);
  const [cycleNo, setCycleNo] = useState(1);
  const cycle = useRef(0);

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
    env.say('calm', 'games.calm.breathGuide');
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
    env.say('calm', 'games.calm.quietGuide');
  }

  function answer(help: string | null) {
    env.sfx('ok');
    onDone({ acc: null, retries: 0, say: 'games.calm.done', mood: 'calm', data: { help, mode, pace: mode === 'breath' ? pace : null } });
  }

  if (phase === 'setup') {
    return (
      <div className="scene calm-set">
        <div className="calm-set__art"><OasisBackdrop /></div>
        <h2 className="q__t">{t('games.calm.how')}</h2>
        <h3>{t('games.calm.pace')}</h3>
        <div className="row row--c" role="group" aria-label={t('games.calm.pace')}>
          {PACES.map((p) => (
            <button key={p.sec} type="button" className={`pace ${pace === p.sec ? 'on' : ''}`} aria-pressed={pace === p.sec} onClick={() => setPace(p.sec)}><b>{t(`games.calm.paces.${p.id}`)}</b><span>{t('common.seconds', { count: p.sec })}</span></button>
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
            className={`br br--${phase}`}
            style={{ animationDuration: `${pace}s`, animationPlayState: env.paused ? 'paused' : 'running' }}
            aria-hidden="true"
          />
        )}
        <p className="calm__t" aria-live="polite">{t(`games.calm.phases.${phase}`)}</p>
        <p className="calm__s">{phase === 'quiet' ? t('games.calm.left', { time: t('common.seconds', { count }) }) : t('games.calm.breathOf', { n: cycleNo, total: CYCLES })}</p>
      </div>
    </div>
  );
}
