import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { playSound } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import { isOneShot, type MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { JOURNEYS } from '../../features/challenges/catalog';
import { MemoryGame } from '../../features/challenges/games';
import { JourneyScene } from '../../features/challenges/JourneyScene';
import type { GameEnv } from '../../features/challenges/types';

const MEET: [MascotState, string][] = [['listening', 'يسمعك'], ['thinking', 'يفكر معك'], ['encouraging', 'يشجعك'], ['celebrating', 'يحتفل معك'], ['calm', 'يهدّيك'], ['concerned', 'يهتم لو تعبت']];
const STEPS = ['يتعرف عليك', 'يفهم يومك وظروفك', 'يجهز لك تحديات تناسبك', 'تلعب وتتفاعل', 'يتعلم من نتائجك', 'تحتفل بتقدمك'];
const SAUDI = [
  ['🕌', 'حماية وقت الصلاة', 'تدخل وقت الصلاة وتختار مدة الحماية'],
  ['🚗', 'قيادة بأمان', 'ما تظهر لك تحديات وأنت تسوق'],
  ['👨‍👩‍👧', 'عزائم وجمعة الأهل', 'خطة أخف قبل المناسبات'],
  ['🌙', 'رمضان والعيد', 'تعدّل روتينك بنفسك'],
  ['🎓', 'دوام ودراسة', 'تنظيم حسب جدولك'],
  ['⛅', 'الطقس', 'غير مربوط حاليًا'],
];
const CYCLE: MascotState[] = ['curious', 'happy', 'celebrating', 'greeting', 'encouraging'];
const FLOATERS = [
  { p: 30, style: { top: '12%', right: '10%', fontSize: 56 }, c: '☁️' },
  { p: -20, style: { top: '30%', left: '8%', fontSize: 44 }, c: '☁️' },
  { p: 40, style: { bottom: '10%', left: '12%', fontSize: 60 }, c: '🌴' },
  { p: -30, style: { bottom: '12%', right: '10%', fontSize: 60 }, c: '🌴' },
];

function PreviewGame({ onStart }: { onStart(): void }) {
  const s = useAppState();
  const [phase, setPhase] = useState<'idle' | 'play' | 'done'>('idle');
  const [acc, setAcc] = useState(0);
  const [mood, setMood] = useState<MascotState>('curious');
  const [bubble, setBubble] = useState('جرّب تحدي صغير بدون تسجيل.');
  const mascot = useMascot(mood);
  const say = useCallback((m: MascotState, t?: string) => {
    if (t != null) setBubble(t);
    if (isOneShot(m)) mascot.play(m);
    else setMood(m);
  }, [mascot.play]);
  const env: GameEnv = { paused: false, g: s.g, hasEvent: false, say, sfx: (k) => playSound(!!s.snd, k) };
  return (
    <div className="card">
      <div className="cb">
        <Mascot state={mascot.state} size={80} still={phase === 'play'} />
        <div className="bub" aria-live="polite">{bubble}</div>
      </div>
      {phase === 'idle' && <button type="button" className="btn" onClick={() => setPhase('play')}>يلا نلعب</button>}
      {phase === 'play' && (
        <MemoryGame diff="easy" env={env} onDone={(r) => { setAcc(r.acc ?? 0); setPhase('done'); say('celebrating', 'يا سلام عليك! تبي نكمل؟'); }} />
      )}
      {phase === 'done' && (
        <>
          <p>نتيجتك {acc}%. هذا غيض من فيض.</p>
          <button type="button" className="btn" onClick={onStart}>يلا نبدأ رحلتنا</button>
        </>
      )}
    </div>
  );
}

export function Landing() {
  const store = useStore();
  const hero = useMascot('idle');
  const [cycle, setCycle] = useState(0);
  const heroBox = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const start = () => store.update((d) => { d.started = 1; });

  useEffect(() => {
    hero.play('greeting');
  }, [hero.play]);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && x.target.classList.add('v')), { threshold: 0.15 });
    root.current?.querySelectorAll('.rv').forEach((x) => io.observe(x));
    return () => io.disconnect();
  }, []);

  function parallax(e: MouseEvent<HTMLDivElement>) {
    const box = heroBox.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    box.querySelectorAll<HTMLElement>('.fl').forEach((f) => {
      const p = Number(f.dataset.p);
      f.style.translate = `${x * p}px ${y * p}px`;
    });
  }

  function poke() {
    const next = (cycle + 1) % CYCLE.length;
    setCycle(next);
    hero.play(CYCLE[next]);
    playSound(!!store.getState().snd, 'tap');
  }

  return (
    <div id="app">
      <div className="lp" ref={root}>
        <div className="lt">
          <b className="brand">خويّك</b>
          <button type="button" className="btn sm" onClick={start}>يلا نبدأ</button>
        </div>
        <div className="lh" ref={heroBox} onMouseMove={parallax}>
          {FLOATERS.map((f, i) => <div key={i} className="fl" data-p={f.p} style={f.style} aria-hidden="true">{f.c}</div>)}
          <div className="in">
            <Mascot state={hero.state} size="large" interactive onClick={poke} label="خويّك، اضغط عليه" className="hero-mascot" />
            <h1>كل يوم له جوّه.. وخويّك يعرف كيف يمشي معك 🤍</h1>
            <p>خويّك رفيقك الذكي، يسولف معك، يفهم يومك، ويجهز لك تحديات ممتعة تناسبك وتساعدك تتقدم على راحتك.</p>
            <button type="button" className="btn cor" onMouseEnter={() => hero.play('happy')} onFocus={() => hero.play('happy')} onClick={start}>يلا نبدأ رحلتنا</button>{' '}
            <button type="button" className="btn alt" onClick={() => document.getElementById('meet')?.scrollIntoView({ behavior: 'smooth' })}>اكتشف خويّك</button>
            <p className="note">جرّب تضغط على خويّك 👆</p>
          </div>
        </div>
        <section id="meet" className="rv">
          <h1>تعرّف على خويّك</h1>
          <p>رفيق صغير يتغير شكله حسب اللحظة: يسمعك، يفكر معك، ويفرح لما تنجز. هو مو معالج نفسي ولا بديل عن أهلك وأصحابك أو المختصين.</p>
          <div className="grid">{MEET.map(([m, l]) => <div key={m} className="card center"><Mascot state={m} size={90} interactive /><h3>{l}</h3></div>)}</div>
        </section>
        <section className="rv">
          <h1>كيف يشتغل؟</h1>
          <div className="steps">{STEPS.map((x, i) => <div key={x} className="card"><div className="step-n">{i + 1}</div><h3>{x}</h3></div>)}</div>
        </section>
        <section className="rv">
          <h1>رحلاتك</h1>
          <div className="grid">{JOURNEYS.map((j) => <div key={j.id} className="card jc"><JourneyScene id={j.id} /><div className="b"><h3>{j.n}</h3><p className="note jc-note">{j.d}</p></div></div>)}</div>
        </section>
        <section className="rv">
          <h1>جرّب تحدي الحين</h1>
          <PreviewGame onStart={start} />
        </section>
        <section className="rv">
          <h1>على قد يومك السعودي</h1>
          <div className="grid">{SAUDI.map(([i, t, d]) => <div key={t} className="card"><div className="emoji">{i}</div><h3>{t}</h3><p className="note">{d}</p></div>)}</div>
        </section>
        <section className="rv">
          <h1>تقدمك ومكافآتك</h1>
          <div className="card"><b>المستوى 3</b><div className="bar"><i style={{ width: '65%' }} /></div><p className="note">مثال توضيحي. بياناتك الحقيقية تظهر بعد ما تلعب.</p></div>
        </section>
        <section className="rv center">
          <div className="closing">
            <Mascot state="happy" size={150} />
            <h1>جاهز تبدأ؟ خويّك بانتظارك!</h1>
            <button type="button" className="btn" onClick={start}>يلا نبدأ</button>
          </div>
        </section>
      </div>
    </div>
  );
}
