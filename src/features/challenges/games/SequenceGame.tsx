import { ArrowDown, ArrowUp, Backpack, BookOpen, Briefcase, CalendarCheck, Car, Coffee, Gift, Laptop, Shirt, Sunrise, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTimers } from '../../../hooks/useTimers';
import { shuffled } from '../../../utils';
import type { GameProps } from '../types';
import { useDrag } from './parts';

interface Step { t: string; i: LucideIcon }
interface SeqScene { title: string; note: string; s: Step[]; whyFirst: string; whyLast: string }

// These are everyday examples, not the user's real events. The middle steps can go in any order,
// because several orders are reasonable. Only the first and last have a clear reason behind them.
const EVENT: SeqScene = {
  title: 'مثال: التجهيز لعزيمة', note: 'لأنك سجلت إن عندك مناسبة.',
  s: [{ t: 'أتأكد من الموعد', i: CalendarCheck }, { t: 'أجهّز الهدية', i: Gift }, { t: 'أستحم وألبس', i: Shirt }, { t: 'أطلع بدري عشان المرور', i: Car }],
  whyFirst: 'لأن معرفة الموعد تحدد باقي الخطوات', whyLast: 'لأن الطلعة تجي بعد ما تخلص تجهيزك',
};
const WORK: SeqScene = {
  title: 'مثال: صباح قبل الدوام', note: 'مثال عام، مو من جدولك.',
  s: [{ t: 'أصحى وأتجهز', i: Sunrise }, { t: 'أشيك مواعيد اليوم', i: CalendarCheck }, { t: 'أفطر لقمة خفيفة', i: Coffee }, { t: 'أطلع للدوام', i: Briefcase }],
  whyFirst: 'لأن باقي الخطوات تجي بعد ما تصحى', whyLast: 'لأن الطلعة تجي بعد ما تخلص تجهيزك',
};
const STUDY: SeqScene = {
  title: 'مثال: صباح قبل الجامعة', note: 'مثال عام، مو من جدولك.',
  s: [{ t: 'أشوف جدول محاضراتي', i: BookOpen }, { t: 'أجهّز لابتوبي وأوراقي', i: Laptop }, { t: 'أخذ قهوتي', i: Coffee }, { t: 'أتحرك للجامعة', i: Backpack }],
  whyFirst: 'لأن الجدول يحدد وش تحتاج تجهزه', whyLast: 'لأن الطلعة تجي بعد ما تخلص تجهيزك',
};

export function SequenceGame({ diff, env, onDone }: GameProps) {
  const [scene] = useState(() => (env.hasEvent ? EVENT : env.sched === 'study' ? STUDY : WORK));
  const steps = diff === 'easy' ? [scene.s[0], scene.s[2], scene.s[3]] : scene.s;
  const correct = steps.map((x) => x.t);
  const icon = (t: string) => steps.find((x) => x.t === t)!.i;
  const n = correct.length;
  const timers = useTimers(env.paused);
  const [pool, setPool] = useState(() => shuffled(correct));
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(n).fill(null));
  const [bad, setBad] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState('');

  const changed = () => { setBad([]); setFeedback(''); env.sfx('tap'); };

  function placeAt(c: string, i: number) {
    if (locked) return;
    const next = slots.map((v) => (v === c ? null : v));
    const from = slots.indexOf(c);
    const nextPool = pool.filter((x) => x !== c);
    const old = next[i];
    if (old) {
      if (from >= 0) next[from] = old;
      else nextPool.push(old);
    }
    next[i] = c;
    setSlots(next);
    setPool(nextPool);
    changed();
  }
  function placeNext(c: string) {
    const i = slots.indexOf(null);
    if (i >= 0) placeAt(c, i);
  }
  function takeBack(c: string) {
    if (locked) return;
    setSlots(slots.map((v) => (v === c ? null : v)));
    setPool([...pool, c]);
    changed();
  }
  function move(i: number, by: number) {
    const j = i + by;
    if (locked || j < 0 || j >= n) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    setSlots(next);
    changed();
  }

  const bind = useDrag((id, target) => {
    if (target === 'pool') {
      if (slots.includes(id)) takeBack(id);
    } else {
      placeAt(id, Number(target));
    }
  });

  // Only the first and last steps have a fixed place; the steps between them can go in any order.
  function check() {
    if (locked || pool.length) return;
    const wrong = [0, n - 1].filter((i) => slots[i] !== correct[i]);
    if (!wrong.length) {
      setLocked(true);
      env.sfx('ok');
      env.say('happy', 'يا سلام! ترتيب مضبوط.');
      setFeedback('ترتيب منطقي. الخطوات اللي بالنص تقدر تبدّلها زي ما يناسبك.');
      timers.after(() => onDone({ acc: tries ? Math.max(60, 100 - tries * 20) : 100, retries: tries }), 1500);
    } else if (!tries) {
      setTries(1);
      setBad(wrong);
      env.sfx('bad');
      const line = wrong[0] === 0 ? `وش رايك نبدأ بـ«${correct[0]}»؟ ${scene.whyFirst}.` : `وش رايك نخلي «${correct[n - 1]}» آخر شي؟ ${scene.whyLast}.`;
      setFeedback(line);
      env.say('encouraging', 'حلو! بس فيه خطوة ودي نغير مكانها.');
    } else {
      setLocked(true);
      setFeedback('هذا ترتيبك النهائي، والمهم إنك جربت.');
      env.say('encouraging', 'عوافي، المهم إنك جربت.');
      timers.after(() => onDone({ acc: Math.round(((n - wrong.length) / n) * 100), retries: tries }), 1600);
    }
  }

  return (
    <div className="scene seq">
      <div className="seq__head">
        <h2 className="q__t">{scene.title}</h2>
        <p className="note flush">{scene.note} رتّبها: اسحب البطاقة، أو اضغط عليها لتروح لأول خانة فاضية.</p>
      </div>
      <ol className="seq__slots">
        {slots.map((c, i) => {
          const Ic = c ? icon(c) : null;
          return (
            <li key={i} data-drop={String(i)} className={`slot ${bad.includes(i) ? 'bad' : ''} ${c ? 'has' : ''}`}>
              <b className="slot__n">{i + 1}</b>
              {c && Ic ? (
                <div className="crd crd--in" {...bind(c)}>
                  <Ic size={18} aria-hidden="true" />
                  <span className="grow">{c}</span>
                  <button type="button" aria-label={`${c}: طلّعها لفوق`} disabled={i === 0 || locked} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
                  <button type="button" aria-label={`${c}: نزّلها لتحت`} disabled={i === n - 1 || locked} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
                  <button type="button" aria-label={`رجّع ${c}`} disabled={locked} onClick={() => takeBack(c)}><X size={16} /></button>
                </div>
              ) : <span className="slot__e">الخطوة {i + 1}</span>}
            </li>
          );
        })}
      </ol>
      <div className="seq__pool" data-drop="pool">
        {pool.map((c) => {
          const Ic = icon(c);
          return (
            <button key={c} type="button" className="crd" {...bind(c)} onClick={() => placeNext(c)}>
              <Ic size={18} aria-hidden="true" /> <span>{c}</span>
            </button>
          );
        })}
        {!pool.length && <span className="note">حطيت كل الخطوات.</span>}
      </div>
      <p className="hint" role="status">{feedback}</p>
      <div className="row row--c"><button type="button" className="btn" disabled={pool.length > 0 || locked} onClick={check}>جاهز</button></div>
    </div>
  );
}
