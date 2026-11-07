import { Lock, Play, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tr } from '../../../i18n';
import { clock } from '../../../utils';
import type { GameProps } from '../types';
import { Ring } from './parts';

// Finishing needs a real minute of active time, so tapping through can't earn the reward.
export const MIN_ACTIVE_SEC = 60;
const LENGTHS = [5, 10, 15, 0];

export function StudySprintGame({ env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'setup' | 'run' | 'reflect'>('setup');
  const [topic, setTopic] = useState('');
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
    setNotes([...notes, v]);
    setNote('');
    env.sfx('tap');
  }

  function finish(reflect: string) {
    env.sfx('ok');
    const time = clock(secs);
    const parked = notes.length;
    onDone({
      acc: null,
      retries: 0,
      say: reflect === 'no' ? 'games.study.doneNo' : 'games.study.doneGood',
      note: () => tr(parked ? 'games.study.noteParked' : 'games.study.note', { time, count: parked }),
      data: { topic: topic.trim(), plannedMin: mins, secs, notes, reflect },
    });
  }

  if (phase === 'setup') {
    return (
      <div className="scene form">
        <label htmlFor="ss-topic"><h2 className="q__t">{t('games.study.topicQ')}</h2></label>
        <input id="ss-topic" dir="auto" maxLength={80} placeholder={t('games.study.topicPh')} value={topic} onChange={(e) => setTopic(e.target.value)} />
        <h3>{t('games.study.lengthQ')}</h3>
        <div className="row row--c" role="group" aria-label={t('games.study.length')}>
          {LENGTHS.map((v) => <button key={v} type="button" className={`pace ${mins === v ? 'on' : ''}`} aria-pressed={mins === v} onClick={() => setMins(v)}><b>{v ? t('common.minutes', { count: v }) : t('games.study.noTimer')}</b></button>)}
        </div>
        <p className="note"><Lock size={13} aria-hidden="true" /> {t('games.common.staysOnDevice')}</p>
        <div className="row row--c"><button type="button" className="btn btn--lg" onClick={() => { setPhase('run'); env.say('calm', 'games.study.quiet'); }}><Play size={17} aria-hidden="true" /> {t('common.start')}</button></div>
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
        <p className="note center">{t('games.common.trackingOnly')}</p>
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
      {!canFinish && <p className="note center">{t('games.study.minNote')}</p>}
    </div>
  );
}
