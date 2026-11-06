import { useEffect, useRef, useState } from 'react';
import { clock } from '../../../utils';
import type { GameProps } from '../types';

const TOTAL = 120;

export function StartGame({ env, onDone }: GameProps) {
  const [task, setTask] = useState('');
  const [step, setStep] = useState('');
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
      env.say('curious', 'اكتب المهمة والخطوة عشان نبدأ.');
      return;
    }
    setPhase('timer');
    env.say('calm', '');
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
      <div className="scene">
        <h2>وش المهمة اللي مأجلها؟</h2>
        <input aria-label="المهمة" placeholder="مثال: أرد على رسالة" value={task} onChange={(e) => setTask(e.target.value)} />
        <p>وش أصغر خطوة أولى؟ (دقيقتين بس)</p>
        <input aria-label="الخطوة الأولى" placeholder="مثال: أفتح الرسالة" value={step} onChange={(e) => setStep(e.target.value)} />
        <br /><br />
        <button type="button" className="btn" onClick={begin}>ابدأ الدقيقتين</button>
      </div>
    );
  }
  if (phase === 'timer') {
    return (
      <div className="scene">
        <h2>{step.trim()}</h2>
        <p className="timer-big" role="timer">{clock(Math.max(0, left))}</p>
        <p className="note">أنا معك بهدوء.</p>
        <button type="button" className="btn alt" onClick={() => { early.current = true; goAsk(); }}>وقفت بدري</button>
      </div>
    );
  }
  return (
    <div className="scene">
      <h2>كيف مشت؟</h2>
      <p>{step.trim()}</p>
      {[['started', 'بديت فيها'], ['partial', 'بديت شوي ووقفت'], ['not', 'ما بديت']].map(([k, l]) => (
        <button key={k} type="button" className="opt" onClick={() => answer(k)}>{l}</button>
      ))}
      <p className="note">إجابتك للمتابعة فقط، وكل إجابة مقبولة.</p>
    </div>
  );
}
