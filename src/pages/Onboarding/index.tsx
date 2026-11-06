import { useEffect, useState } from 'react';
import { fireConfetti } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import type { MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { useStore } from '../../context/AppStateContext';
import { JOURNEYS } from '../../features/challenges/catalog';
import type { Gender, JourneyId } from '../../types';

interface Draft {
  name: string;
  g: Gender;
  needs: JourneyId[];
  sched: string;
  pat: string;
  sleep: string;
  pp: number;
  snd: number;
  rm: number;
}

const MOODS: MascotState[] = ['idle', 'listening', 'curious', 'calm', 'idle'];

export function Onboarding() {
  const store = useStore();
  const [step, setStep] = useState(0);
  const [tm, setTm] = useState<Draft>({ name: store.getState().name, g: 'm', needs: [], sched: 'work', pat: '', sleep: '', pp: 30, snd: 1, rm: 0 });
  const mascot = useMascot(MOODS[step]);

  useEffect(() => {
    mascot.play('greeting');
  }, [mascot.play]);

  const chip = <K extends keyof Draft>(k: K, v: Draft[K], label: string) => (
    <button key={`${String(k)}-${String(v)}`} type="button" className={`chip ${tm[k] === v ? 'on' : ''}`} aria-pressed={tm[k] === v} onClick={() => setTm({ ...tm, [k]: v })}>{label}</button>
  );

  function next() {
    const name = step === 0 ? tm.name.trim() || (tm.g === 'f' ? 'بطلة' : 'بطل') : tm.name;
    if (step < 4) {
      setTm({ ...tm, name });
      setStep(step + 1);
      mascot.play('encouraging');
      return;
    }
    fireConfetti(!!tm.rm);
    store.update((d) => {
      Object.assign(d, tm, { name, needs: tm.needs.length ? tm.needs : ['gen'], done: 1, view: 'home' });
      d.chat = [{ b: 1, t: `هلا والله يا ${name}! وش علومك اليوم؟ احكيلي عن يومك: نومك، دوامك، أو أي عزيمة عندك، وأرتّب لك مهمة اليوم على قدّك.` }];
    });
  }

  const steps = [
    <>
      <h1>هلا والله! أنا خويّك</h1>
      <p>وبنبدأ رحلتنا سوا. وش أسمّيك؟</p>
      <input aria-label="اسمك أو لقبك" value={tm.name} placeholder="اسمك أو لقبك" className="name-input" onChange={(e) => setTm({ ...tm, name: e.target.value })} />
      <p>أخاطبك كـ</p>
      {chip('g', 'm', 'ذكر')}{chip('g', 'f', 'أنثى')}
      <p className="note">ما نطلب تشخيص ولا معلومات طبية. بياناتك محفوظة على جهازك فقط وتقدر تمسحها بأي وقت.</p>
    </>,
    <>
      <h2>وش تحب نشتغل عليه؟</h2>
      <p className="note">اختياري، وتقدر تغيّره بعدين.</p>
      {JOURNEYS.map((j) => {
        const on = tm.needs.includes(j.id);
        return <button key={j.id} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setTm({ ...tm, needs: on ? tm.needs.filter((x) => x !== j.id) : [...tm.needs, j.id] })}>{j.n}</button>;
      })}
    </>,
    <>
      <h2>كيف يومك غالبًا؟</h2>
      {chip('sched', 'work', 'دوام')}{chip('sched', 'study', 'دراسة')}{chip('sched', 'flex', 'مرن')}
      <p>وقت نشاطك</p>
      {chip('pat', 'am', 'صباحي')}{chip('pat', 'pm', 'مسائي')}
      <p>نومك (اختياري)</p>
      {chip('sleep', 'early', 'أنام بدري')}{chip('sleep', 'late', 'أنام متأخر')}{chip('sleep', 'skip', 'أفضّل أتخطى')}
    </>,
    <>
      <h2>الصلاة</h2>
      <p>كم دقيقة نحمي بعد الأذان؟</p>
      {[0, 20, 30, 45].map((v) => chip('pp', v, v ? v + ' دقيقة' : 'ما أبي'))}
      <p className="note">ما فيه ربط مباشر بمواقيت الصلاة. تقدر تدخل وقت الصلاة القادمة من ملفّك أو من الرئيسية.</p>
    </>,
    <>
      <h2>راحتك</h2>
      <p>الأصوات</p>
      {chip('snd', 1, 'شغّلها')}{chip('snd', 0, 'بدون صوت')}
      <p>الحركة</p>
      {chip('rm', 0, 'عادية')}{chip('rm', 1, 'أقل حركة')}
      <p className="note">الإشعارات غير مفعّلة في هذا العرض.</p>
    </>,
  ];

  return (
    <div id="app">
      <main className="onboard">
        <div className="dots onboard__dots" aria-label={`الخطوة ${step + 1} من ${steps.length}`}>
          {steps.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}
        </div>
        <div className="card">
          <Mascot state={mascot.state} size={step === 0 ? 150 : 130} label="خويّك" />
          <div className="scene" key={step}>{steps[step]}</div>
          <br /><br />
          {step > 0 && <><button type="button" className="btn alt" onClick={() => setStep(step - 1)}>رجوع</button>{' '}</>}
          <button type="button" className="btn" onClick={next}>{step === 4 ? 'خلصنا' : 'التالي'}</button>
        </div>
      </main>
    </div>
  );
}
