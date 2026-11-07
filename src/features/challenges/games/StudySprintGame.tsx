import { Lock, Play, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clock } from '../../../utils';
import type { GameProps } from '../types';
import { Ring } from './parts';

// Finishing needs a real minute of active time, so tapping through can't earn the reward.
export const MIN_ACTIVE_SEC = 60;
const LENGTHS: [number, string][] = [[5, '٥ دقائق'], [10, '١٠ دقائق'], [15, '١٥ دقيقة'], [0, 'بدون مؤقت']];

export function StudySprintGame({ env, onDone }: GameProps) {
  const [phase, setPhase] = useState<'setup' | 'run' | 'reflect'>('setup');
  const [topic, setTopic] = useState('');
  const [mins, setMins] = useState(5);
  const [secs, setSecs] = useState(0);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const total = mins * 60;

  useEffect(() => {
    env.say('encouraging', 'جلسة قصيرة على قدك.');
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
      env.say('curious', 'خلص الوقت. كيف مشت؟');
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
    onDone({
      acc: null,
      retries: 0,
      say: reflect === 'no' ? 'عادي، بعض الجلسات كذا.' : 'حلو، جلسة ثانية متى ما ناسبك.',
      note: `ذاكرت ${clock(secs)}${notes.length ? `، وركنت ${notes.length} مشتتات` : ''}.`,
      data: { topic: topic.trim(), plannedMin: mins, secs, notes, reflect },
    });
  }

  if (phase === 'setup') {
    return (
      <div className="scene form">
        <label htmlFor="ss-topic"><h2 className="q__t">وش بتذاكر؟ (اختياري)</h2></label>
        <input id="ss-topic" maxLength={80} placeholder="مثال: الفصل الثالث" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <h3>كم مدة تناسبك؟</h3>
        <div className="row row--c" role="group" aria-label="المدة">
          {LENGTHS.map(([v, l]) => <button key={v} type="button" className={`pace ${mins === v ? 'on' : ''}`} aria-pressed={mins === v} onClick={() => setMins(v)}><b>{l}</b></button>)}
        </div>
        <p className="note"><Lock size={13} aria-hidden="true" /> اللي تكتبه يبقى على جهازك.</p>
        <div className="row row--c"><button type="button" className="btn btn--lg" onClick={() => { setPhase('run'); env.say('calm', 'أنا ساكت. أي شي يشتتك اكتبه بجنب.'); }}><Play size={17} aria-hidden="true" /> ابدأ</button></div>
      </div>
    );
  }

  if (phase === 'reflect') {
    return (
      <div className="scene q">
        <h2 className="q__t">كيف مشت الجلسة؟</h2>
        <div className="choices choices--3">
          {[['good', 'مشت زين'], ['some', 'شوي'], ['no', 'ما مشت']].map(([k, l]) => <button key={k} type="button" className="opt" onClick={() => finish(k)}>{l}</button>)}
        </div>
        {notes.length > 0 && (
          <div className="parked"><h3>اللي ركنته</h3><ul>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>
        )}
        <p className="note center">إجابتك للمتابعة فقط.</p>
      </div>
    );
  }

  const canFinish = secs >= MIN_ACTIVE_SEC;
  return (
    <div className="scene timer-v">
      {topic.trim() && <p className="eyebrow center">{topic.trim()}</p>}
      <Ring value={total ? 1 - secs / total : 1} size={190}>
        <span className="timer-big" role="timer">{clock(total ? Math.max(0, total - secs) : secs)}</span>
      </Ring>
      <form className="pb__add" onSubmit={(e) => { e.preventDefault(); park(); }}>
        <input aria-label="مشتت تبي تركنه لبعدين" maxLength={80} placeholder="جاك شي يشتتك؟ اكتبه هنا وارجع" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="btn sm alt" aria-label="اركنه"><Plus size={16} aria-hidden="true" /></button>
      </form>
      {notes.length > 0 && <p className="note center">ركنت {notes.length}. نرجع لها بعد الجلسة.</p>}
      <div className="row row--c">
        <button type="button" className="btn alt" disabled={!canFinish} onClick={() => { setPhase('reflect'); env.say('curious', 'كيف مشت؟'); }}>خلصت</button>
      </div>
      {!canFinish && <p className="note center">تقدر تنهي الجلسة بعد أول دقيقة. وإذا ما ناسبك، استخدم «إنهاء» من فوق.</p>}
    </div>
  );
}
