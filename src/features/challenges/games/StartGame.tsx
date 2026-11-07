import { Lock, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { clock } from '../../../utils';
import type { GameProps } from '../types';
import { Ring } from './parts';

const TOTAL = 120;
const TASKS = ['أرد على رسالة', 'أبدأ مذاكرة', 'أرتب مكتبي', 'أخلص معاملة'];
const STEPS = ['أفتح الملف أو الرسالة', 'أكتب أول سطر', 'أجهز اللي أحتاجه', 'أحدد وش أول جزء'];

export function StartGame({ env, onDone }: GameProps) {
  const [task, setTask] = useState('');
  const [step, setStep] = useState('');
  const [error, setError] = useState(false);
  const [phase, setPhase] = useState<'form' | 'timer' | 'ask'>('form');
  const [left, setLeft] = useState(TOTAL);
  const early = useRef(false);

  useEffect(() => {
    env.say('encouraging', 'نبدأ بخطوة صغيرة بس.');
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
    env.say('curious', 'وش صار معك؟');
  }

  function begin() {
    if (!task.trim() || !step.trim()) {
      setError(true);
      return;
    }
    setError(false);
    setPhase('timer');
    env.say('calm', 'أنا معك بهدوء.');
  }

  function answer(o: string) {
    env.sfx('ok');
    onDone({
      acc: null,
      retries: 0,
      mood: o === 'not' ? 'calm' : 'celebrating',
      say: o === 'not' ? 'عادي، المهم إنك جربت. نرجع لها لما يناسبك.' : 'يا سلام! بديت فعلاً.',
      data: { task: task.trim(), step: step.trim(), outcome: o, early: early.current, secs: TOTAL - Math.max(0, left) },
    });
  }

  if (phase === 'form') {
    return (
      <div className="scene form">
        <label htmlFor="st-task"><h2 className="q__t">وش المهمة اللي مأجلها؟</h2></label>
        <input id="st-task" maxLength={120} placeholder="اكتبها بكلماتك" value={task} onChange={(e) => setTask(e.target.value)} />
        <div className="tags" role="group" aria-label="أمثلة للمهمة">
          {TASKS.map((x) => <button key={x} type="button" className="tag tag--btn" onClick={() => setTask(x)}>{x}</button>)}
        </div>
        <label htmlFor="st-step"><h3>وش أصغر خطوة أولى؟ دقيقتين بس.</h3></label>
        <input id="st-step" maxLength={120} placeholder="خطوة صغيرة وواضحة" value={step} onChange={(e) => setStep(e.target.value)} />
        <div className="tags" role="group" aria-label="أمثلة للخطوة">
          {STEPS.map((x) => <button key={x} type="button" className="tag tag--btn" onClick={() => setStep(x)}>{x}</button>)}
        </div>
        {error && <p className="hint" role="alert">اكتب المهمة والخطوة عشان نبدأ.</p>}
        <p className="note"><Lock size={13} aria-hidden="true" /> اللي تكتبه يبقى على جهازك، وما ينرسل لأي جهة. تقدر تمسحه من ملفي.</p>
        <div className="row row--c"><button type="button" className="btn btn--lg" onClick={begin}><Play size={17} aria-hidden="true" /> ابدأ الدقيقتين</button></div>
      </div>
    );
  }
  if (phase === 'timer') {
    return (
      <div className="scene timer-v">
        <p className="eyebrow center">{task.trim()}</p>
        <h2 className="q__t">{step.trim()}</h2>
        <Ring value={Math.max(0, left) / TOTAL} size={210}>
          <span className="timer-big" role="timer" aria-label={`باقي ${clock(Math.max(0, left))}`}>{clock(Math.max(0, left))}</span>
        </Ring>
        <p className="note center">{env.paused ? 'موقف مؤقتًا.' : 'روح سوّها، والوقت يمشي هنا. تقدر توقفه من فوق.'}</p>
        <div className="row row--c"><button type="button" className="btn alt" onClick={() => { early.current = true; goAsk(); }}>وقفت بدري</button></div>
      </div>
    );
  }
  return (
    <div className="scene q">
      <h2 className="q__t">كيف مشت؟</h2>
      <p className="center">{step.trim()}</p>
      <div className="choices choices--3">
        {[['started', 'بديت فيها'], ['partial', 'بديت شوي ووقفت'], ['not', 'ما بديت']].map(([k, l]) => (
          <button key={k} type="button" className="opt" onClick={() => answer(k)}>{l}</button>
        ))}
      </div>
      <p className="note center">انتهاء الوقت ما يعني إنك خلصتها. اختر اللي صار فعلاً، وكل إجابة مقبولة.</p>
    </div>
  );
}
