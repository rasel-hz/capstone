import { ChevronsDown, Pencil, Play, Timer, TimerOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clock } from '../../../utils';
import type { CrisisLevel } from '../../companion/crisis';
import type { GameResult } from '../../../types';
import type { GameProps } from '../types';
import { AskNext, CrisisStop, crisisIn, Ring } from './parts';

// From a real chunk of work down to the smallest possible move. Generic, so they fit any task, and
// always shown as suggestions the user can replace. Stable IDs, so a language switch keeps the place.
export const LADDER = ['block', 'part', 'where', 'ready', 'open'] as const;
// Examples for someone who already knows their first step. Picking one only fills the box.
const STEP_EXAMPLES = ['open', 'line', 'ready', 'one'] as const;
type Mode = 60 | 120 | 0;
// Two minutes first: it's the suggested length.
const MODES: Mode[] = [120, 60, 0];
// Level points for the effort the user reported. Trying counts too; reward points don't change.
const EFFORT = { started: 1, bit: 0.6, not: 0.3 } as const;
type Outcome = keyof typeof EFFORT;

type Phase = 'task' | 'know' | 'write' | 'shrink' | 'mode' | 'go' | 'ask' | 'later';
const ROUND: Record<Phase, number> = { task: 1, know: 1, write: 2, shrink: 2, mode: 3, go: 3, ask: 4, later: 4 };

/**
 * "Just the first step" (micro_start). The user names a task, then either writes the first step they already
 * know or shrinks one until it feels easy, and tries it with a 2-minute timer, 60 seconds or none.
 * Level points follow the effort they report. "Not yet" can turn into a plan with "Break it down".
 * A task and step handed over from another challenge are filled in, so the user goes straight on.
 */
export function MicroStartGame({ diff, env, onDone, cfg, seed }: GameProps) {
  const { t } = useTranslation();
  const mine = cfg?.tasks.filter((x) => x.src === 'user').map((x) => x.text) ?? [];
  const [phase, setPhase] = useState<Phase>(seed?.task ? (seed.step ? 'mode' : 'know') : 'task');
  const [task, setTask] = useState(seed?.task ?? '');
  const [level, setLevel] = useState(diff === 'easy' ? 2 : 0);
  const [own, setOwn] = useState(seed?.step ?? '');
  const [editing, setEditing] = useState(false);
  const [shrinks, setShrinks] = useState(0);
  const [mode, setMode] = useState<Mode>(120);
  const [left, setLeft] = useState(120);
  const [crisis, setCrisis] = useState<CrisisLevel>(0);
  const [held, setHeld] = useState<GameResult | null>(null);
  const started = useRef(0);

  useEffect(() => {
    env.round(ROUND[phase], 4, 'games.common.step');
    env.say(phase === 'go' ? 'calm' : phase === 'ask' || phase === 'later' ? 'curious' : 'encouraging', `games.micro.say.${phase}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Typed text is checked on the device before going on.
  function onward(next: Phase, ...texts: string[]) {
    const lv = crisisIn(...texts);
    if (lv) setCrisis(lv);
    else setPhase(next);
  }

  useEffect(() => {
    if (phase !== 'go' || !mode || env.paused) return;
    const iv = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(iv);
  }, [phase, mode, env.paused]);

  useEffect(() => {
    if (phase === 'go' && mode && left <= 0) setPhase('ask');
  }, [left, mode, phase]);

  // The user's own wording wins over any suggestion.
  const step = own.trim() || t(`games.micro.ladder.${LADDER[level]}`);

  function go(m: Mode) {
    setMode(m);
    setLeft(m || 0);
    started.current = Date.now();
    setPhase('go');
    env.sfx('tap');
  }

  function answer(outcome: Outcome) {
    env.sfx('ok');
    const r: GameResult = {
      acc: null,
      retries: 0,
      xpScale: EFFORT[outcome],
      mood: outcome === 'not' ? 'calm' : 'celebrating',
      say: `games.micro.done.${outcome}`,
      note: outcome === 'not' ? 'games.micro.note.not' : 'games.micro.note.started',
      // Saved exactly as typed, on the device only.
      data: { task: task.trim(), step, ownStep: !!own.trim(), level: LADDER[level], shrinks, mode, outcome, secs: Math.round((Date.now() - started.current) / 1000) },
    };
    // Not started yet: offer to plan it for another time instead of leaving it there.
    if (outcome === 'not') {
      setHeld(r);
      setPhase('later');
    } else onDone(r);
  }

  if (crisis) return <CrisisStop level={crisis} onBack={() => setCrisis(0)} />;

  if (phase === 'later' && held) {
    return (
      <AskNext
        q={t('games.micro.laterQ')}
        detail={task.trim()}
        yes={t('games.micro.laterYes')}
        no={t('games.micro.laterNo')}
        onYes={() => onDone({ ...held, then: { id: 'breakdown', seed: { task: task.trim(), from: 'micro_start' } } })}
        onNo={() => onDone(held)}
      />
    );
  }

  if (phase === 'task') {
    return (
      <div className="scene form ms">
        <label htmlFor="ms-task"><h2 className="q__t">{t('games.micro.taskQ')}</h2></label>
        {mine.length > 0 && (
          <div className="tags" role="group" aria-label={t('games.micro.fromChat')}>
            {mine.map((x) => <button key={x} type="button" dir="auto" className={`tag tag--btn ${task === x ? 'on' : ''}`} aria-pressed={task === x} onClick={() => setTask(x)}>{x}</button>)}
          </div>
        )}
        <input id="ms-task" dir="auto" maxLength={80} placeholder={t('games.micro.taskPh')} value={task} onChange={(e) => setTask(e.target.value)} />
        <div className="row row--c"><button type="button" className="btn" disabled={!task.trim()} onClick={() => onward('know', task)}>{t('common.next')}</button></div>
      </div>
    );
  }

  if (phase === 'know') {
    return (
      <div className="scene q">
        <p className="eyebrow center" dir="auto">{task.trim()}</p>
        <h2 className="q__t">{t('games.micro.knowQ')}</h2>
        <div className="choices choices--2">
          <button type="button" className="opt" onClick={() => setPhase('write')}>{t('games.micro.knowYes')}</button>
          <button type="button" className="opt" onClick={() => { setOwn(''); setPhase('shrink'); }}>{t('games.micro.knowHelp')}</button>
        </div>
      </div>
    );
  }

  if (phase === 'write') {
    return (
      <div className="scene form ms">
        <p className="eyebrow center" dir="auto">{task.trim()}</p>
        <label htmlFor="ms-own"><h2 className="q__t">{t('games.micro.writeQ')}</h2></label>
        <input id="ms-own" dir="auto" maxLength={80} placeholder={t('games.micro.ownPh')} value={own} onChange={(e) => setOwn(e.target.value)} />
        <div className="tags" role="group" aria-label={t('games.common.examples')}>
          {STEP_EXAMPLES.map((k) => <button key={k} type="button" className="tag tag--btn" onClick={() => setOwn(t(`games.micro.stepExamples.${k}`))}>{t(`games.micro.stepExamples.${k}`)}</button>)}
        </div>
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => setPhase('know')}>{t('common.back')}</button>
          <button type="button" className="btn" disabled={!own.trim()} onClick={() => onward('mode', own)}>{t('common.next')}</button>
        </div>
      </div>
    );
  }

  if (phase === 'shrink') {
    const smallest = level >= LADDER.length - 1;
    return (
      <div className="scene ms">
        <p className="eyebrow center" dir="auto">{task.trim()}</p>
        <h2 className="q__t center">{t('games.micro.shrinkQ')}</h2>
        <div className="ms__ladder" aria-hidden="true">
          {LADDER.map((k, i) => <i key={k} className={i <= level ? 'on' : ''} />)}
        </div>
        {editing ? (
          <form className="pb__add" onSubmit={(e) => { e.preventDefault(); const lv = crisisIn(own); if (lv) setCrisis(lv); else setEditing(false); }}>
            <input dir="auto" autoFocus aria-label={t('games.micro.ownLabel')} maxLength={80} placeholder={t('games.micro.ownPh')} value={own} onChange={(e) => setOwn(e.target.value)} />
            <button type="submit" className="btn sm alt">{t('common.ok')}</button>
          </form>
        ) : (
          <div className="ms__step">
            <p dir="auto">{step}</p>
            {!own.trim() && <em className="pp__tag">{t('games.plan.suggestion')}</em>}
          </div>
        )}
        <div className="row row--c">
          <button type="button" className="btn alt" disabled={smallest || !!own.trim()} onClick={() => { setLevel(level + 1); setShrinks(shrinks + 1); env.sfx('tap'); }}>
            <ChevronsDown size={16} aria-hidden="true" /> {t('games.micro.smaller')}
          </button>
          <button type="button" className="btn" onClick={() => onward('mode', own)}>{t('games.micro.doable')}</button>
        </div>
        <div className="row row--c">
          <button type="button" className="btn-link" onClick={() => setEditing(true)}><Pencil size={14} aria-hidden="true" /> {t('games.micro.writeOwn')}</button>
        </div>
      </div>
    );
  }

  if (phase === 'mode') {
    return (
      <div className="scene ms">
        <h2 className="q__t center">{t('games.micro.modeQ')}</h2>
        <p className="center" dir="auto"><b>{step}</b></p>
        <div className="ms__modes">
          {MODES.map((m) => (
            <button key={m} type="button" className="pace" onClick={() => go(m)}>
              {m ? <Timer size={18} aria-hidden="true" /> : <TimerOff size={18} aria-hidden="true" />}
              <b>{t(`games.micro.modes.${m}`)}</b>
              <span>{t(`games.micro.modesNote.${m}`)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'go') {
    return (
      <div className="scene timer-v">
        <p className="eyebrow center" dir="auto">{task.trim()}</p>
        <h2 className="q__t" dir="auto">{step}</h2>
        {mode ? (
          <Ring value={Math.max(0, left) / mode} size={190}>
            <span className="timer-big" role="timer" aria-label={t('games.start.timeLeft', { time: clock(Math.max(0, left)) })}>{clock(Math.max(0, left))}</span>
          </Ring>
        ) : null}
        <p className="note center">{t(env.paused ? 'games.start.paused' : 'games.micro.goNow')}</p>
        <div className="row row--c"><button type="button" className="btn" onClick={() => setPhase('ask')}><Play size={16} aria-hidden="true" /> {t(mode ? 'games.micro.doneEarly' : 'games.micro.back')}</button></div>
      </div>
    );
  }

  return (
    <div className="scene q">
      <h2 className="q__t">{t('games.micro.askQ')}</h2>
      <p className="center" dir="auto">{step}</p>
      <div className="choices choices--3">
        {(['started', 'bit', 'not'] as const).map((k) => <button key={k} type="button" className="opt" onClick={() => answer(k)}>{t(`games.micro.outcomes.${k}`)}</button>)}
      </div>
    </div>
  );
}
