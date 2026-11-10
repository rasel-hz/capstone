import { Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameProps } from '../types';
import { Ring } from './parts';

// The 20-20-20 habit: after a while at a screen, look at something about 6 metres away for 20 seconds.
// It rests the eyes for a moment. It isn't a treatment and says nothing about anyone's eyesight.
export const LOOK_SEC = 20;

/** "Rest your eyes" (eye_rest). One round completes it; another is optional. Also the eyes option in "A break your way". */
export function EyeRestGame({ env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'ready' | 'look' | 'blink'>('ready');
  const [left, setLeft] = useState(LOOK_SEC);
  const [stopped, setStopped] = useState(false);
  const [rounds, setRounds] = useState(0);

  useEffect(() => {
    env.say('calm', `games.eye_rest.say.${phase}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'look' || stopped || env.paused) return;
    const iv = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(iv);
  }, [phase, stopped, env.paused]);

  useEffect(() => {
    if (phase === 'look' && left <= 0) {
      env.sfx('tap');
      setRounds((n) => n + 1);
      setPhase('blink');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  function look() {
    setLeft(LOOK_SEC);
    setStopped(false);
    setPhase('look');
  }

  if (phase === 'ready') {
    return (
      <div className="scene q">
        <h2 className="q__t">{t('games.eye_rest.readyQ')}</h2>
        <div className="row row--c"><button type="button" className="btn btn--lg" onClick={look}>{t('games.eye_rest.go')}</button></div>
      </div>
    );
  }

  if (phase === 'look') {
    return (
      <div className="scene timer-v">
        <h2 className="q__t">{t('games.eye_rest.lookTitle')}</h2>
        {/* With reduced motion the ring steps once a second instead of gliding. */}
        <div className={env.rm ? 'ring--still' : ''}>
          <Ring value={1 - Math.max(0, left) / LOOK_SEC} size={180} tone="#8BCDF1">
            <span className="timer-big" role="timer" aria-label={t('games.eye_rest.left', { count: Math.max(0, left) })}>{Math.max(0, left)}</span>
          </Ring>
        </div>
        <div className="row row--c">
          <button type="button" className="btn sm alt" aria-pressed={stopped} onClick={() => setStopped(!stopped)}>
            {stopped ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />} {t(stopped ? 'games.eye_rest.resume' : 'games.eye_rest.stop')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scene q">
      <h2 className="q__t">{t('games.eye_rest.blink')}</h2>
      <div className="row row--c">
        <button type="button" className="btn" onClick={() => { env.sfx('ok'); onDone({ acc: null, retries: 0, mood: 'calm', say: 'games.eye_rest.said', data: { rounds } }); }}>{t('games.eye_rest.done')}</button>
        <button type="button" className="btn alt" onClick={look}>{t('games.eye_rest.again')}</button>
      </div>
    </div>
  );
}
