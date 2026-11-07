import { ArrowRight, Check, Lock, Volume2, VolumeX, Zap, ZapOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fireConfetti } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import type { MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { Segmented } from '../../components/ui/kit';
import { useStore } from '../../context/AppStateContext';
import { JourneyArt } from '../../features/challenges/ChallengeArt';
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
const STEP_NAMES = ['عنك', 'رحلاتك', 'يومك', 'الصلاة', 'راحتك'];
// These steps are optional, so they can be skipped outright.
const OPTIONAL = [false, true, true, true, true];

export function Onboarding() {
  const store = useStore();
  const [step, setStep] = useState(0);
  const [tm, setTm] = useState<Draft>({ name: store.getState().name, g: 'm', needs: [], sched: 'work', pat: '', sleep: '', pp: 30, snd: 1, rm: 0 });
  const mascot = useMascot(MOODS[step]);
  const up = (p: Partial<Draft>) => setTm({ ...tm, ...p });

  useEffect(() => {
    mascot.play('greeting');
  }, [mascot.play]);

  function next() {
    const name = step === 0 ? tm.name.trim() || (tm.g === 'f' ? 'بطلة' : 'بطل') : tm.name;
    if (step < 4) {
      up({ name });
      setStep(step + 1);
      mascot.play('encouraging');
      return;
    }
    fireConfetti(!!tm.rm);
    store.update((d) => {
      Object.assign(d, tm, { name, needs: tm.needs.length ? tm.needs : ['gen'], done: 1, view: 'home' });
      d.chat = [{ b: 1, t: `هلا والله يا ${name}! وش علومك اليوم؟ احكي لي عن يومك: نومك، دوامك، أو أي عزيمة عندك، وأرتب لك مهمة اليوم على قدك.` }];
    });
  }

  const steps = [
    <>
      <h1>هلا والله! أنا خويّك</h1>
      <p>وبنبدأ رحلتنا سوا. وش أسمّيك؟</p>
      <label className="sr-only" htmlFor="ob-name">اسمك أو لقبك</label>
      <input id="ob-name" value={tm.name} maxLength={40} placeholder="اسمك أو لقبك" className="name-input" onChange={(e) => up({ name: e.target.value })} />
      <p>أخاطبك بصيغة</p>
      <Segmented className="seg--c" label="صيغة المخاطبة" value={tm.g} options={[{ value: 'm', label: 'مذكر' }, { value: 'f', label: 'مؤنث' }]} onChange={(g) => up({ g })} />
      <p className="note ob-priv"><Lock size={13} aria-hidden="true" /> ما نطلب تشخيص ولا معلومات طبية. بياناتك على جهازك فقط، وتقدر تمسحها بأي وقت.</p>
    </>,
    <>
      <h2>وش تحب نشتغل عليه؟</h2>
      <p className="note">اختر أكثر من وحدة، أو تخطاها وتغيّرها بعدين. هذي رحلات دعم وتدريب، مو تشخيص.</p>
      <div className="ob-j">
        {JOURNEYS.map((j) => {
          const on = tm.needs.includes(j.id);
          return (
            <button key={j.id} type="button" className={`ob-j__b ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => up({ needs: on ? tm.needs.filter((x) => x !== j.id) : [...tm.needs, j.id] })}>
              <span className="ob-j__a"><JourneyArt id={j.id} /></span>
              <span className="ob-j__t">{j.n}</span>
              {on && <span className="ob-j__c" aria-hidden="true"><Check size={14} /></span>}
            </button>
          );
        })}
      </div>
    </>,
    <>
      <h2>كيف يومك غالبًا؟</h2>
      <Segmented className="seg--c" label="جدولك" value={tm.sched} options={[{ value: 'work', label: 'دوام' }, { value: 'study', label: 'دراسة' }, { value: 'flex', label: 'مرن' }]} onChange={(sched) => up({ sched })} />
      <p>وقت نشاطك</p>
      <Segmented className="seg--c" label="وقت نشاطك" value={tm.pat || null} options={[{ value: 'am', label: 'صباحي' }, { value: 'pm', label: 'مسائي' }]} onChange={(pat) => up({ pat })} />
      <p>نومك (اختياري)</p>
      <Segmented className="seg--c" label="نومك" value={tm.sleep || null} options={[{ value: 'early', label: 'أنام بدري' }, { value: 'late', label: 'أنام متأخر' }, { value: 'skip', label: 'أفضّل أتخطى' }]} onChange={(sleep) => up({ sleep })} />
    </>,
    <>
      <h2>الصلاة</h2>
      <p>كم دقيقة نحمي بعد الأذان؟</p>
      <Segmented className="seg--c" label="مدة الحماية" value={tm.pp} options={[0, 20, 30, 45].map((v) => ({ value: v, label: v ? `${v} دقيقة` : 'ما أبي' }))} onChange={(pp) => up({ pp })} />
      <p className="note">ما فيه ربط مباشر بمواقيت الصلاة. تدخل وقت الصلاة القادمة بنفسك من الرئيسية أو ملفك.</p>
    </>,
    <>
      <h2>راحتك</h2>
      <p>الأصوات</p>
      <Segmented className="seg--c" label="الأصوات" value={tm.snd} options={[{ value: 1, label: 'شغّلها', icon: Volume2 }, { value: 0, label: 'بدون صوت', icon: VolumeX }]} onChange={(snd) => up({ snd })} />
      <p>الحركة</p>
      <Segmented className="seg--c" label="الحركة" value={tm.rm} options={[{ value: 0, label: 'عادية', icon: Zap }, { value: 1, label: 'أقل حركة', icon: ZapOff }]} onChange={(rm) => up({ rm })} />
      <p className="note">الإشعارات غير مفعّلة حاليًا.</p>
    </>,
  ];

  return (
    <div id="app" className="ob-wrap">
      <main className="onboard">
        <ol className="stepper" aria-label={`الخطوة ${step + 1} من ${steps.length}`}>
          {STEP_NAMES.map((n, i) => (
            <li key={n} className={i < step ? 'is-done' : i === step ? 'is-cur' : ''} aria-current={i === step ? 'step' : undefined}>
              <span aria-hidden="true">{i < step ? <Check size={13} /> : i + 1}</span><em>{n}</em>
            </li>
          ))}
        </ol>
        <div className="ob-card">
          <Mascot state={mascot.state} size={step === 0 ? 130 : 88} label="خويّك" />
          <div className="scene" key={step}>{steps[step]}</div>
          <div className="ob-act">
            {step > 0 && <button type="button" className="btn alt" onClick={() => setStep(step - 1)}><ArrowRight size={16} aria-hidden="true" /> رجوع</button>}
            {OPTIONAL[step] && step < 4 && <button type="button" className="btn-link" onClick={next}>تخطى</button>}
            <button type="button" className="btn" onClick={next}>{step === 4 ? 'خلصنا' : 'التالي'}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
