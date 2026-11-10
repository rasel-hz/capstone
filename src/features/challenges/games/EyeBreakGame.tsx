import { Eye, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameProps } from '../types';

// The 20-20-20 habit: after about 20 minutes on a screen, look at something about 6 metres away for
// 20 seconds. The timer runs while the user looks away, so nothing here needs watching. It is a habit,
// not a treatment, and it starts only when the user opens it: nothing is scheduled or sent.
export const EYE_SECONDS = 20;

/** Seconds left, from the time the timer actually ran. Pauses don't count. */
export const secondsLeft = (ranMs: number) => Math.max(0, Math.ceil(EYE_SECONDS - ranMs / 1000));

export function EyeBreakGame({ env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [held, setHeld] = useState(false);
  const [ran, setRan] = useState(0);
  const pauses = useRef(0);
  const sent = useRef(false);
  const running = phase === 'run' && !held && !env.paused;

  useEffect(() => {
    env.say('curious', 'games.eye.intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Counts real running time only, so pausing (here or from the player) holds the timer exactly.
  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const iv = setInterval(() => {
      // The step is worked out here, not inside the updater, which React may run after `last` has moved on.
      const now = Date.now();
      const step = now - last;
      last = now;
      setRan((r) => Math.min(EYE_SECONDS * 1000, r + step));
    }, 100);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (phase === 'run' && ran >= EYE_SECONDS * 1000) {
      setPhase('done');
      env.sfx('ok');
      env.say('happy', 'games.eye.doneSay');
    }
  }, [ran, phase, env]);

  function start() {
    setPhase('run');
    env.say('calm', 'games.eye.lookAway');
  }
  function toggle() {
    if (!held) pauses.current++;
    setHeld(!held);
  }
  function finish() {
    if (sent.current) return;
    sent.current = true;
    onDone({ acc: null, retries: 0, mood: 'happy', say: 'games.eye.doneSay', data: { seconds: EYE_SECONDS, pauses: pauses.current } });
  }

  if (phase === 'intro') {
    return (
      <div className="scene eye">
        <span className="eye__icon" aria-hidden="true"><Eye size={34} /></span>
        <h2 className="q__t">{t('games.eye.title')}</h2>
        <p className="center">{t('games.eye.lead')}</p>
        <p className="note center">{t('games.eye.rule')}</p>
        <div className="row row--c"><button type="button" className="btn" onClick={start}><Play size={16} aria-hidden="true" /> {t('games.eye.start')}</button></div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="scene eye">
        <span className="eye__icon eye__icon--done" aria-hidden="true"><Eye size={34} /></span>
        <h2 className="q__t" role="status">{t('games.eye.done')}</h2>
        <div className="row row--c"><button type="button" className="btn" onClick={finish}>{t('games.eye.finish')}</button></div>
      </div>
    );
  }

  const left = secondsLeft(ran);
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="scene eye">
      <p className="eye__away">{t('games.eye.awayCue')}</p>
      <div className={`eye-timer ${running && !env.rm ? 'is-breathing' : ''}`} role="timer" aria-live="off" aria-label={t('games.eye.leftLabel', { n: left })}>
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="80" r={r} fill="none" className="eye-timer__track" strokeWidth="9" />
          <circle cx="80" cy="80" r={r} fill="none" className="eye-timer__v" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (ran / (EYE_SECONDS * 1000))} transform="rotate(-90 80 80)" />
        </svg>
        <span className="eye-timer__n" aria-hidden="true">{left}</span>
      </div>
      <p className="sr-only" role="status">{held ? t('games.eye.paused') : ''}</p>
      <div className="row row--c">
        <button type="button" className="btn alt" onClick={toggle} aria-pressed={held}>
          {held ? <><Play size={16} aria-hidden="true" /> {t('games.eye.resume')}</> : <><Pause size={16} aria-hidden="true" /> {t('games.eye.pause')}</>}
        </button>
      </div>
    </div>
  );
}
