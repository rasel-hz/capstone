import { Play, Plus, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../context/AppStateContext';
import { tr } from '../../../i18n';
import type { GameResult } from '../../../types';
import { clock } from '../../../utils';
import { addGoals } from '../../buddy/buddy';
import type { CrisisLevel } from '../../companion/crisis';
import type { GameProps } from '../types';
import { AskNext, CrisisStop, crisisIn, Ring } from './parts';

// Finishing needs a real minute of active time, so tapping through can't earn the reward.
export const MIN_ACTIVE_SEC = 60;
const LENGTHS = [5, 10, 15, 25, 0];

/**
 * "Focus your way" (study_sprint): a short focus session for study or any work. Distractions are parked
 * and can go into today's goals afterwards. Then a 5-minute break, and another session if the user wants.
 */
export function StudySprintGame({ env, onDone, seed }: GameProps) {
  const { t } = useTranslation();
  const store = useStore();
  const [phase, setPhase] = useState<'setup' | 'run' | 'reflect' | 'goals' | 'break' | 'again'>('setup');
  const [topic, setTopic] = useState(seed?.task ?? '');
  const [crisis, setCrisis] = useState<CrisisLevel>(0);
  const [held, setHeld] = useState<GameResult | null>(null);
  const [mins, setMins] = useState(5);
  const [secs, setSecs] = useState(0);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const total = mins * 60;

  useEffect(() => {
    env.say('encouraging', 'games.study.intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'run' || env.paused) return;
    const iv = setInterval(() => setSecs((v) => v + 1), 1000);
    return () => clearInterval(iv);
  }, [phase, env.paused]);

  useEffect(() => {
    if (phase === 'run' && total && secs >= total) {
      setPhase('reflect');
      env.say('curious', 'games.study.timeUp');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs, phase, total]);

  function park() {
    const v = note.trim();
    if (!v) return;
    const lv = crisisIn(v);
    if (lv) return setCrisis(lv);
    setNotes([...notes, v]);
    setNote('');
    env.sfx('tap');
  }

  function finish(reflect: string) {
    env.sfx('ok');
    const time = clock(secs);
    const parked = notes.length;
    setHeld({
      acc: null,
      retries: 0,
      say: reflect === 'no' ? 'games.study.doneNo' : 'games.study.doneGood',
      note: () => tr(parked ? 'games.study.noteParked' : 'games.study.note', { time, count: parked }),
      data: { topic: topic.trim(), plannedMin: mins, secs, notes, reflect },
    });
    setPhase(parked ? 'goals' : 'break');
  }

  const fromHere = { task: topic.trim(), from: 'study_sprint' as const };

  if (crisis) return <CrisisStop level={crisis} onBack={() => setCrisis(0)} />;

  if (phase === 'goals' && held) {
    return (
      <AskNext
        q={t('games.study.goalsQ')}
        yes={t('games.study.goalsYes')}
        no={t('games.study.goalsNo')}
        onYes={() => { store.update((d) => { addGoals(d, notes); }); setPhase('break'); }}
        onNo={() => setPhase('break')}
      />
    );
  }
  if (phase === 'break' && held) {
    return (
      <AskNext
        q={t('games.study.breakQ')}
        yes={t('games.study.breakYes')}
        no={t('games.study.breakNo')}
        onYes={() => onDone({ ...held, then: { id: 'calm_landscape', seed: fromHere } })}
        onNo={() => setPhase('again')}
      />
    );
  }
  if (phase === 'again' && held) {
    return (
      <AskNext
        q={t('games.study.againQ')}
        yes={t('games.study.againYes')}
        no={t('games.study.againNo')}
        onYes={() => onDone({ ...held, then: { id: 'study_sprint', seed: fromHere } })}
        onNo={() => onDone(held)}
      />
    );
  }

  if (phase === 'setup') {
    return (
      <div className="scene form">
        <label htmlFor="ss-topic"><h2 className="q__t">{t('games.study.topicQ')}</h2></label>
        <input id="ss-topic" dir="auto" maxLength={80} placeholder={t('games.study.topicPh')} value={topic} onChange={(e) => setTopic(e.target.value)} />
        <h3>{t('games.study.lengthQ')}</h3>
        <div className="row row--c row--wrap" role="group" aria-label={t('games.study.length')}>
          {LENGTHS.map((v) => <button key={v} type="button" className={`pace ${mins === v ? 'on' : ''}`} aria-pressed={mins === v} onClick={() => setMins(v)}><b>{v ? t('common.minutes', { count: v }) : t('games.study.noTimer')}</b></button>)}
        </div>
        <p className="tip"><Smartphone size={16} aria-hidden="true" /> {t('games.study.phoneTip')}</p>
        <div className="row row--c"><button type="button" className="btn btn--lg" onClick={() => { const lv = crisisIn(topic); if (lv) return setCrisis(lv); setPhase('run'); env.say('calm', 'games.study.quiet'); }}><Play size={17} aria-hidden="true" /> {t('common.start')}</button></div>
      </div>
    );
  }

  if (phase === 'reflect') {
    return (
      <div className="scene q">
        <h2 className="q__t">{t('games.study.how')}</h2>
        <div className="choices choices--3">
          {['good', 'some', 'no'].map((k) => <button key={k} type="button" className="opt" onClick={() => finish(k)}>{t(`games.study.reflections.${k}`)}</button>)}
        </div>
        {notes.length > 0 && (
          <div className="parked"><h3>{t('games.study.parked')}</h3><ul>{notes.map((n, i) => <li key={i} dir="auto">{n}</li>)}</ul></div>
        )}
      </div>
    );
  }

  const canFinish = secs >= MIN_ACTIVE_SEC;
  return (
    <div className="scene timer-v">
      {topic.trim() && <p className="eyebrow center" dir="auto">{topic.trim()}</p>}
      <Ring value={total ? 1 - secs / total : 1} size={190}>
        <span className="timer-big" role="timer">{clock(total ? Math.max(0, total - secs) : secs)}</span>
      </Ring>
      <form className="pb__add" onSubmit={(e) => { e.preventDefault(); park(); }}>
        <input dir="auto" aria-label={t('games.study.parkLabel')} maxLength={80} placeholder={t('games.study.parkPh')} value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="btn sm alt" aria-label={t('games.study.park')}><Plus size={16} aria-hidden="true" /></button>
      </form>
      {notes.length > 0 && <p className="note center">{t('games.study.parkedCount', { count: notes.length })}</p>}
      <div className="row row--c">
        <button type="button" className="btn alt" disabled={!canFinish} onClick={() => { setPhase('reflect'); env.say('curious', 'games.study.howShort'); }}>{t('games.study.finished')}</button>
      </div>
    </div>
  );
}
