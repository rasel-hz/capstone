import { useState, type DragEvent } from 'react';
import { useTimers } from '../../../hooks/useTimers';
import { shuffled } from '../../../utils';
import type { GameProps } from '../types';

const EVENT = { t: 'تجهيز العزيمة الليلة', s: ['أتأكد من موعد العزيمة', 'أجهّز الهدية', 'أستحم وألبس', 'أطلع بدري عشان المرور'] };
const MORNING = { t: 'تجهيز الصباح', s: ['أصحى', 'ألبس', 'أفطر', 'أطلع للدوام'] };

export function SequenceGame({ diff, env, onDone }: GameProps) {
  const [scene] = useState(() => {
    const sc = env.hasEvent ? EVENT : MORNING;
    return { title: sc.t, correct: diff === 'easy' ? [sc.s[0], sc.s[2], sc.s[3]] : sc.s };
  });
  const { title, correct } = scene;
  const n = correct.length;
  const timers = useTimers(env.paused);
  const [pool, setPool] = useState(() => shuffled(correct));
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(n).fill(null));
  const [bad, setBad] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [locked, setLocked] = useState(false);

  function placeNext(c: string) {
    const i = slots.indexOf(null);
    if (i < 0) return;
    setSlots(slots.map((v, x) => (x === i ? c : v)));
    setPool(pool.filter((x) => x !== c));
    setBad([]);
    env.sfx('tap');
  }
  function takeBack(c: string) {
    setSlots(slots.map((v) => (v === c ? null : v)));
    setPool([...pool, c]);
    setBad([]);
    env.sfx('tap');
  }
  function drop(e: DragEvent, i: number) {
    e.preventDefault();
    const c = e.dataTransfer.getData('text/plain');
    if (!c) return;
    const next = slots.map((v) => (v === c ? null : v));
    const nextPool = pool.filter((x) => x !== c);
    if (next[i]) nextPool.push(next[i] as string);
    next[i] = c;
    setSlots(next);
    setPool(nextPool);
    setBad([]);
  }

  // Only the first and last steps have a fixed place; the steps between them can go in any order.
  function check() {
    if (locked || pool.length) return;
    const wrong = [0, n - 1].filter((i) => slots[i] !== correct[i]);
    if (!wrong.length) {
      setLocked(true);
      env.sfx('ok');
      env.say('happy', 'يا سلام! ترتيب مضبوط.');
      timers.after(() => onDone({ acc: tries ? Math.max(60, 100 - tries * 20) : 100, retries: tries }), 1100);
    } else if (!tries) {
      setTries(1);
      setBad(wrong);
      env.sfx('bad');
      env.say('encouraging', wrong[0] === 0 ? `حلو! بس وش رايك نبدأ بـ"${correct[0]}"؟ جرب مرة ثانية.` : `حلو! بس وش رايك نخلي "${correct[n - 1]}" آخر شي؟ جرب مرة ثانية.`);
    } else {
      setLocked(true);
      env.say('encouraging', 'عوافي، هذا ترتيبك النهائي. المهم إنك جربت.');
      timers.after(() => onDone({ acc: Math.round(((n - wrong.length) / n) * 100), retries: tries }), 1400);
    }
  }

  return (
    <div className="scene">
      <h2>{title}</h2>
      <p className="note">رتّب الخطوات: اسحبها أو اضغط عليها</p>
      {slots.map((c, i) => (
        <div key={i} className={`slot ${bad.includes(i) ? 'bad' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, i)}>
          <b>{i + 1}</b>
          {c && <button type="button" className="crd" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', c)} onClick={() => takeBack(c)}>{c}</button>}
        </div>
      ))}
      <div>
        {pool.map((c) => (
          <button key={c} type="button" className="crd" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', c)} onClick={() => placeNext(c)}>{c}</button>
        ))}
      </div>
      <br />
      <button type="button" className="btn" disabled={pool.length > 0 || locked} onClick={check}>جاهز</button>
    </div>
  );
}
