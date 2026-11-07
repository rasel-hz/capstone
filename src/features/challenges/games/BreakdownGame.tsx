import { ArrowDown, ArrowUp, Lock, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GameProps } from '../types';

const SEEDS: Record<string, string[]> = {
  'أذاكر للاختبار': ['أحدد الدروس المطلوبة', 'أجمع الملخصات', 'أذاكر أول درس ٢٥ دقيقة', 'أحل أسئلة قصيرة'],
  'أجهز العرض': ['أكتب الفكرة الرئيسية', 'أحدد ٣ نقاط', 'أسوي أول شريحة', 'أتدرب مرة وحدة'],
  'أرتب الغرفة': ['أجمع الملابس', 'أرمي الزبالة', 'أرتب المكتب', 'أكنس الأرض'],
  'أخلص المعاملة': ['أحدد الأوراق المطلوبة', 'أصور الأوراق', 'أرفعها في الموقع', 'أتابع الطلب'],
};
const WHEN = ['بعد الصلاة', 'بعد القهوة', 'أول ما أوصل البيت', 'بعد الغدا'];

export function BreakdownGame({ diff, env, onDone }: GameProps) {
  const max = diff === 'easy' ? 1 : 5;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [task, setTask] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [when, setWhen] = useState('');
  const seeds = SEEDS[task.trim()] ?? [];

  useEffect(() => {
    env.round(step, 3, 'الخطوة');
    env.say(step === 3 ? 'encouraging' : 'curious', step === 1 ? 'وش الشي الكبير اللي يثقل عليك؟' : step === 2 ? 'قسّمها لخطوات صغيرة.' : 'متى بتبدأ أول خطوة؟');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function add(v: string) {
    const t = v.trim();
    if (!t || steps.includes(t) || steps.length >= max) return;
    setSteps([...steps, t]);
    setDraft('');
    env.sfx('tap');
  }
  function move(i: number, by: number) {
    const n = [...steps];
    [n[i], n[i + by]] = [n[i + by], n[i]];
    setSteps(n);
  }

  if (step === 1) {
    return (
      <div className="scene form">
        <label htmlFor="bd-task"><h2 className="q__t">وش المهمة الكبيرة؟</h2></label>
        <input id="bd-task" maxLength={100} placeholder="اكتبها بكلماتك، أو اختر مثال" value={task} onChange={(e) => setTask(e.target.value)} />
        <div className="tags" role="group" aria-label="أمثلة">
          {Object.keys(SEEDS).map((x) => <button key={x} type="button" className="tag tag--btn" onClick={() => setTask(x)}>{x}</button>)}
        </div>
        <p className="note"><Lock size={13} aria-hidden="true" /> اللي تكتبه يبقى على جهازك.</p>
        <div className="row row--c"><button type="button" className="btn" disabled={!task.trim()} onClick={() => setStep(2)}>التالي</button></div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="scene form">
        <h2 className="q__t">فكّك: {task.trim()}</h2>
        <ol className="bd__list">
          {steps.map((x, i) => (
            <li key={x} className="crd crd--in">
              <b className="slot__n">{i + 1}</b>
              <span className="grow">{x}</span>
              <button type="button" aria-label={`${x}: طلّعها لفوق`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
              <button type="button" aria-label={`${x}: نزّلها لتحت`} disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
              <button type="button" aria-label={`احذف ${x}`} onClick={() => setSteps(steps.filter((y) => y !== x))}><X size={16} /></button>
            </li>
          ))}
        </ol>
        {!steps.length && <p className="note center">ما أضفت خطوات للحين. خلها صغيرة، بحيث تبدأها بدون تفكير كثير.</p>}
        {steps.length < max ? (
          <>
            <form className="pb__add" onSubmit={(e) => { e.preventDefault(); add(draft); }}>
              <input aria-label="خطوة جديدة" maxLength={80} placeholder="أضف خطوة صغيرة" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button type="submit" className="btn sm alt" aria-label="أضف الخطوة"><Plus size={16} aria-hidden="true" /></button>
            </form>
            {seeds.filter((x) => !steps.includes(x)).length > 0 && (
              <div className="tags" role="group" aria-label="أمثلة للخطوات">
                {seeds.filter((x) => !steps.includes(x)).map((x) => <button key={x} type="button" className="tag tag--btn" onClick={() => add(x)}><Plus size={13} aria-hidden="true" /> {x}</button>)}
              </div>
            )}
          </>
        ) : <p className="note center">{max === 1 ? 'خطوة وحدة تكفي لهالنسخة.' : 'كفاية، ٥ خطوات تغطيها.'}</p>}
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => setStep(1)}>رجوع</button>
          <button type="button" className="btn" disabled={!steps.length} onClick={() => setStep(3)}>التالي</button>
        </div>
      </div>
    );
  }

  const ready = !!when.trim();
  return (
    <div className="scene form">
      <h2 className="q__t">حط لها خطة</h2>
      <p className="plan">إذا صار <b>{when.trim() || '...'}</b>، بسوي: <b>{steps[0]}</b></p>
      <div className="tags" role="group" aria-label="متى؟">
        {WHEN.map((x) => <button key={x} type="button" className={`tag tag--btn ${when === x ? 'on' : ''}`} aria-pressed={when === x} onClick={() => setWhen(x)}>{x}</button>)}
      </div>
      <label htmlFor="bd-when" className="note">أو اكتب وقت يناسبك</label>
      <input id="bd-when" maxLength={40} placeholder="مثال: الساعة ٥" value={when} onChange={(e) => setWhen(e.target.value)} />
      <div className="row row--c">
        <button type="button" className="btn alt" onClick={() => setStep(2)}>رجوع</button>
        <button
          type="button"
          className="btn"
          disabled={!ready}
          onClick={() => {
            env.sfx('ok');
            onDone({
              acc: null,
              retries: 0,
              say: 'كذا صارت أخف.',
              note: `خطتك: إذا صار ${when.trim()}، بتسوي: ${steps[0]}. النقاط على الخطة، مو على تنفيذها، لأننا ما نقدر نتحقق منه.`,
              data: { task: task.trim(), steps, plan: { when: when.trim(), firstStep: steps[0] } },
            });
          }}
        >خلصت الخطة</button>
      </div>
    </div>
  );
}
