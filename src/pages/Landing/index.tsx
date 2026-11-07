import { BookOpen, CarFront, CloudSun, Moon, Users, type LucideIcon, Landmark, MessageCircle, ListChecks, Gamepad2, BarChart3, Gift, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound, prefersReduced } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import { isOneShot, type MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { IconBadge } from '../../components/ui/kit';
import { useAppState, useStore } from '../../context/AppStateContext';
import { JourneyArt, OasisBackdrop } from '../../features/challenges/ChallengeArt';
import { JOURNEYS } from '../../features/challenges/catalog';
import { MemoryGame } from '../../features/challenges/games';
import type { GameEnv } from '../../features/challenges/types';

const MEET: [MascotState, string][] = [['listening', 'يسمعك'], ['thinking', 'يفكر معك'], ['encouraging', 'يشجعك'], ['celebrating', 'يحتفل معك'], ['calm', 'يهدّيك'], ['concerned', 'يهتم لو تعبت']];
const STEPS: [LucideIcon, string, string][] = [
  [MessageCircle, 'تسولف معه', 'تقول له عن يومك، وهو يسألك قبل ما يسجل أي شي.'],
  [ListChecks, 'يجهز لك مهمة', 'ثلاث خطوات قصيرة، مع سبب كل وحدة.'],
  [Gamepad2, 'تلعب وتتفاعل', 'تبدأها مرة وحدة، وتنتقل بين التحديات تلقائيًا.'],
  [BarChart3, 'تشوف نتائجك', 'أرقام حقيقية من محاولاتك، بدون تشخيص.'],
  [Gift, 'تفتح مكافآت', 'نقاط وإنجازات داخل التطبيق، وبدون سلاسل أيام.'],
];
const SAUDI: [LucideIcon, string, string][] = [
  [Landmark, 'وقت الصلاة', 'تدخل الوقت وتختار مدة الحماية، ونأجل التحديات.'],
  [CarFront, 'القيادة', 'حدد قبل ما تتحرك، وما يظهر لك أي تحدي. عيونك على الطريق.'],
  [Users, 'العزائم وجمعة الأهل', 'تقول له عن مناسبتك، ويخفف مهمتك بموافقتك.'],
  [Moon, 'رمضان والعيد', 'تعدّل روتينك بنفسك، بدون افتراضات.'],
  [BookOpen, 'الدوام والدراسة', 'تحديات وأمثلة تناسب جدولك.'],
  [CloudSun, 'الطقس', 'غير مربوط حاليًا، وما ندّعي غير كذا.'],
];
const CYCLE: MascotState[] = ['curious', 'happy', 'celebrating', 'greeting', 'encouraging'];

function PreviewGame({ onStart }: { onStart(): void }) {
  const s = useAppState();
  const [phase, setPhase] = useState<'idle' | 'play' | 'done'>('idle');
  const [acc, setAcc] = useState(0);
  const [mood, setMood] = useState<MascotState>('curious');
  const [bubble, setBubble] = useState('جرّب تحدي صغير، بدون تسجيل.');
  const mascot = useMascot(mood);
  const say = useCallback((m: MascotState, t?: string) => {
    if (t != null) setBubble(t);
    if (isOneShot(m)) mascot.play(m);
    else setMood(m);
  }, [mascot.play]);
  const env: GameEnv = { paused: false, g: s.g, hasEvent: false, sched: s.sched, rm: !!s.rm || prefersReduced(), snd: !!s.snd, say, sfx: (k) => playSound(!!s.snd, k), round: () => {} };
  return (
    <div className="preview">
      <div className="cb">
        <Mascot state={mascot.state} size={72} still={phase === 'play'} />
        <div className="bub" aria-live="polite">{bubble}</div>
      </div>
      {phase === 'idle' && <div className="center"><button type="button" className="btn btn--lg" onClick={() => setPhase('play')}>يلا نلعب</button></div>}
      {phase === 'play' && (
        <MemoryGame diff="easy" env={env} onDone={(r) => { setAcc(r.acc ?? 0); setPhase('done'); say(r.acc ? 'happy' : 'encouraging', r.acc ? 'يا سلام! تبي نكمل؟' : 'عوافي، هذي بس عينة. تبي نكمل؟'); }} />
      )}
      {phase === 'done' && (
        <div className="center">
          <p>دقتك من أول محاولة: <b>{acc}%</b>. هذي عينة، وما انحفظت.</p>
          <button type="button" className="btn btn--lg" onClick={onStart}>يلا نبدأ رحلتنا</button>
        </div>
      )}
    </div>
  );
}

export function Landing() {
  const store = useStore();
  const hero = useMascot('idle');
  const [cycle, setCycle] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const start = () => store.update((d) => { d.started = 1; });

  useEffect(() => {
    hero.play('greeting');
  }, [hero.play]);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && x.target.classList.add('v')), { threshold: 0.12 });
    root.current?.querySelectorAll('.rv').forEach((x) => io.observe(x));
    return () => io.disconnect();
  }, []);

  function poke() {
    const next = (cycle + 1) % CYCLE.length;
    setCycle(next);
    hero.play(CYCLE[next]);
    playSound(!!store.getState().snd, 'tap');
  }

  return (
    <div id="app">
      <div className="lp" ref={root}>
        <header className="lt">
          <b className="brand">خويّك</b>
          <button type="button" className="btn sm" onClick={start}>يلا نبدأ</button>
        </header>

        <section className="lh">
          <OasisBackdrop className="lh__bg" />
          <div className="lh__in">
            <div className="lh__txt">
              <p className="eyebrow">رفيق سعودي ليومك</p>
              <h1>كل يوم له جوّه، وخويّك يعرف كيف يمشي معك</h1>
              <p className="lh__p">يسولف معك بلهجتك، يجهز لك مهمة قصيرة على قد طاقتك، وتلعب تحديات تساعدك ترتب يومك. وما يشخّص ولا يعالج.</p>
              <div className="row">
                <button type="button" className="btn btn--lg" onClick={start} onMouseEnter={() => hero.play('happy')} onFocus={() => hero.play('happy')}>يلا نبدأ رحلتنا</button>
                <button type="button" className="btn btn--lg alt" onClick={() => document.getElementById('meet')?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth' })}>اكتشف خويّك</button>
              </div>
            </div>
            <div className="lh__m">
              <Mascot state={hero.state} size={230} interactive onClick={poke} label="خويّك، اضغط عليه يتفاعل" />
              <p className="note center">جرّب تضغط عليه</p>
            </div>
          </div>
        </section>

        <section className="ls rv">
          <h2 className="ls__t">كيف يشتغل؟</h2>
          <ol className="flow">
            {STEPS.map(([Icon, t, d], i) => (
              <li key={t}><span className="flow__n" aria-hidden="true">{i + 1}</span><IconBadge icon={Icon} tone="lil" size={20} /><h3>{t}</h3><p className="note flush">{d}</p></li>
            ))}
          </ol>
        </section>

        <section id="meet" className="ls rv">
          <div className="ls__split">
            <div>
              <h2 className="ls__t">تعرّف على خويّك</h2>
              <p>رفيق صغير يتفاعل مع اللحظة: يسمعك، يفكر معك، ويفرح لما تنجز. هو مو معالج نفسي، ولا بديل عن أهلك وأصحابك أو المختصين.</p>
            </div>
            <ul className="meet">{MEET.map(([m, l]) => <li key={m}><Mascot state={m} size={78} interactive /><span>{l}</span></li>)}</ul>
          </div>
        </section>

        <section className="ls rv">
          <h2 className="ls__t">جرّب تحدي الحين</h2>
          <PreviewGame onStart={start} />
        </section>

        <section className="ls rv">
          <h2 className="ls__t">رحلات تختارها أنت</h2>
          <p className="note">رحلات دعم وتدريب، مو برامج علاجية. تقدر تختار أكثر من وحدة، وما نطلب تشخيص.</p>
          <div className="lj">{JOURNEYS.map((j) => <div key={j.id} className="lj__c"><div className="lj__art"><JourneyArt id={j.id} /></div><b>{j.n}</b></div>)}</div>
        </section>

        <section className="ls rv">
          <h2 className="ls__t">على قد يومك السعودي</h2>
          <div className="saudi">{SAUDI.map(([Icon, t, d]) => <div key={t}><IconBadge icon={Icon} tone="sage" size={20} /><div><h3>{t}</h3><p className="note flush">{d}</p></div></div>)}</div>
        </section>

        <section className="ls rv">
          <div className="honest">
            <IconBadge icon={ShieldCheck} tone="em" size={22} />
            <div>
              <h2>بصراحة</h2>
              <p>خويّك منصة عافية، مو جهة تشخيص أو علاج. بياناتك محفوظة على جهازك، والردود الذكية ما تشتغل إلا بموافقتك. ما عندنا شركاء ولا قسائم حاليًا. إذا تمر بوقت صعب، كلّم شخص تثق فيه أو مختص.</p>
            </div>
          </div>
        </section>

        <section className="ls rv center closing">
          <Mascot state="happy" size={130} />
          <h2>جاهز تبدأ؟ خويّك بانتظارك.</h2>
          <button type="button" className="btn btn--lg" onClick={start}>يلا نبدأ</button>
        </section>
      </div>
    </div>
  );
}
