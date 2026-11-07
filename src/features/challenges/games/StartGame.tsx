import { Lock, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clock } from '../../../utils';
import type { GameProps } from '../types';
import { Ring } from './parts';

const TOTAL = 120;
const TASKS = ['message', 'study', 'desk', 'errand'];
const STEPS = ['open', 'line', 'prepare', 'part'];

export function StartGame({ env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [task, setTask] = useState('');
  const [step, setStep] = useState('');
  const [error, setError] = useState(false);
  const [phase, setPhase] = useState<'form' | 'timer' | 'ask'>('form');
  const [left, setLeft] = useState(TOTAL);
  const early = useRef(false);

  useEffect(() => {
    env.say('encouraging', 'games.start.intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'timer' || env.paused) return;
    const iv = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(iv);
  }, [phase, env.paused]);

  useEffect(() => {
    if (phase === 'timer' && left <= 0) goAsk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  function goAsk() {
    setPhase('ask');
    env.say('curious', 'games.start.whatHappened');
  }

  function begin() {
    if (!task.trim() || !step.trim()) {
      setError(true);
      return;
    }
    setError(false);
    setPhase('timer');
    env.say('calm', 'games.start.withYou');
  }

  function answer(o: string) {
    env.sfx('ok');
    onDone({
      acc: null,
      retries: 0,
      mood: o === 'not' ? 'calm' : 'celebrating',
      say: o === 'not' ? 'games.start.notStarted' : 'games.start.started',
      // What the user typed is saved exactly as typed, in whichever language they wrote it.
      data: { task: task.trim(), step: step.trim(), outcome: o, early: early.current, secs: TOTAL - Math.max(0, left) },
    });
  }

  if (phase === 'form') {
    return (
      <div className="scene form">
        <label htmlFor="st-task"><h2 className="q__t">{t('games.start.taskQ')}</h2></label>
        <input id="st-task" dir="auto" maxLength={120} placeholder={t('games.start.taskPh')} value={task} onChange={(e) => setTask(e.target.value)} />
        <div className="tags" role="group" aria-label={t('games.start.taskExamples')}>
          {TASKS.map((x) => <button key={x} type="button" className="tag tag--btn" onClick={() => setTask(t(`games.start.tasks.${x}`))}>{t(`games.start.tasks.${x}`)}</button>)}
        </div>
        <label htmlFor="st-step"><h3>{t('games.start.stepQ')}</h3></label>
        <input id="st-step" dir="auto" maxLength={120} placeholder={t('games.start.stepPh')} value={step} onChange={(e) => setStep(e.target.value)} />
        <div className="tags" role="group" aria-label={t('games.start.stepExamples')}>
          {STEPS.map((x) => <button key={x} type="button" className="tag tag--btn" onClick={() => setStep(t(`games.start.steps.${x}`))}>{t(`games.start.steps.${x}`)}</button>)}
        </div>
        {error && <p className="hint" role="alert">{t('games.start.error')}</p>}
        <p className="note"><Lock size={13} aria-hidden="true" /> {t('games.start.privacy')}</p>
        <div className="row row--c"><button type="button" className="btn btn--lg" onClick={begin}><Play size={17} aria-hidden="true" /> {t('games.start.begin')}</button></div>
      </div>
    );
  }
  if (phase === 'timer') {
    return (
      <div className="scene timer-v">
        <p className="eyebrow center" dir="auto">{task.trim()}</p>
        <h2 className="q__t" dir="auto">{step.trim()}</h2>
        <Ring value={Math.max(0, left) / TOTAL} size={210}>
          <span className="timer-big" role="timer" aria-label={t('games.start.timeLeft', { time: clock(Math.max(0, left)) })}>{clock(Math.max(0, left))}</span>
        </Ring>
        <p className="note center">{t(env.paused ? 'games.start.paused' : 'games.start.goDoIt')}</p>
        <div className="row row--c"><button type="button" className="btn alt" onClick={() => { early.current = true; goAsk(); }}>{t('games.start.stoppedEarly')}</button></div>
      </div>
    );
  }
  return (
    <div className="scene q">
      <h2 className="q__t">{t('games.start.how')}</h2>
      <p className="center" dir="auto">{step.trim()}</p>
      <div className="choices choices--3">
        {['started', 'partial', 'not'].map((k) => (
          <button key={k} type="button" className="opt" onClick={() => answer(k)}>{t(`games.start.outcomes.${k}`)}</button>
        ))}
      </div>
      <p className="note center">{t('games.start.honest')}</p>
    </div>
  );
}
