import { ArrowRight, Check, ChevronLeft, Compass, Play, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, ProgressBar } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { ChallengeArt, JourneyArt } from '../../features/challenges/ChallengeArt';
import { CHALLENGES, JOURNEYS } from '../../features/challenges/catalog';
import { useMissions } from '../../features/mission/MissionProvider';
import type { AppState, Journey, JourneyId } from '../../types';

const tried = (s: AppState, j: Journey) => j.a.filter((a) => s.hist.some((h) => h.id === a && h.status === 'COMPLETED'));

function useToggle() {
  const store = useStore();
  return (id: JourneyId) => store.update((d) => {
    d.needs = d.needs.includes(id) ? d.needs.filter((x) => x !== id) : [...d.needs, id];
    if (!d.needs.length) d.needs = ['gen'];
  });
}

function JourneyDetail({ j, onBack }: { j: Journey; onBack(): void }) {
  const s = useAppState();
  const missions = useMissions();
  const toggle = useToggle();
  const done = tried(s, j);
  const nextId = j.a.find((a) => !done.includes(a));
  const on = s.needs.includes(j.id);
  return (
    <>
      <button type="button" className="btn-link back" onClick={onBack}><ArrowRight size={17} aria-hidden="true" /> كل الرحلات</button>
      <header className={`jd__head jw jw--${j.id}`}>
        <div className="jd__art"><JourneyArt id={j.id} /></div>
        <div className="jd__txt">
          <h1>{j.n}</h1>
          <p>{j.d}</p>
          <ProgressBar value={done.length} max={j.a.length} label="تحديات الرحلة اللي كملتها" />
          <p className="note">{done.length ? `كمّلت ${done.length} من ${j.a.length} تحديات في هذي الرحلة.` : `ما بديت للحين. فيها ${j.a.length} تحديات.`}</p>
          <button type="button" className={`btn sm ${on ? 'alt' : ''}`} aria-pressed={on} onClick={() => toggle(j.id)}>{on ? <><Check size={15} aria-hidden="true" /> رحلة نشطة</> : <><Plus size={15} aria-hidden="true" /> أضفها لرحلاتي</>}</button>
        </div>
      </header>
      <p className="note">هذي رحلة دعم وتدريب، مو برنامج علاجي ولا تشخيص. تستخدم تحديات مشتركة مع رحلات ثانية.</p>
      <ol className="path">
        {j.a.map((a, i) => {
          const c = CHALLENGES[a];
          const isDone = done.includes(a);
          const isNext = a === nextId;
          return (
            <li key={a} className={`path__n ${isDone ? 'is-done' : ''} ${isNext ? 'is-next' : ''}`}>
              <span className="path__dot" aria-hidden="true">{isDone ? <Check size={18} /> : i + 1}</span>
              <div className="path__card">
                <div className="path__art"><ChallengeArt id={a} /></div>
                <div className="grow">
                  <div className="tl__t">
                    <b>{c.t}</b>
                    {isDone && <span className="tag tag--ok">كمّلته</span>}
                    {isNext && <span className="tag tag--cur">التالي</span>}
                  </div>
                  <p className="note flush">{c.purpose}</p>
                </div>
                <button type="button" className={`btn sm ${isNext ? '' : 'alt'}`} aria-label={`العب ${c.t}`} onClick={() => missions.start([{ id: a, why: 'من رحلة ' + j.n, diff: 'normal' }])}><Play size={14} aria-hidden="true" /> العب</button>
              </div>
            </li>
          );
        })}
      </ol>
      {!nextId && (
        <div className="path__end">
          <Mascot state="happy" size={80} />
          <div><h3><Sparkles size={16} aria-hidden="true" /> جربت كل تحديات الرحلة</h3><p className="note flush">تقدر تعيد أي واحد منها، وتحديات أكثر تنضاف مع الوقت.</p></div>
        </div>
      )}
    </>
  );
}

export function Journeys() {
  const s = useAppState();
  const toggle = useToggle();
  const [open, setOpen] = useState<JourneyId | null>(null);
  const j = JOURNEYS.find((x) => x.id === open);
  if (j) return <JourneyDetail j={j} onBack={() => setOpen(null)} />;
  return (
    <>
      <PageHeader title="رحلاتي" sub="اختر رحلة أو أكثر، وما نطلب تشخيص. هذي رحلات دعم وتدريب، مو علاج." />
      <div className="jgrid">
        {JOURNEYS.map((x) => {
          const on = s.needs.includes(x.id);
          const n = tried(s, x).length;
          return (
            <article key={x.id} className={`jc jw jw--${x.id} ${on ? 'is-on' : ''}`}>
              <button type="button" className="jc__open" onClick={() => setOpen(x.id)} aria-label={`استكشف ${x.n}`}>
                <div className="jc__art"><JourneyArt id={x.id} /></div>
                {on && <span className="tag tag--ok jc__badge"><Check size={13} aria-hidden="true" /> نشطة</span>}
              </button>
              <div className="jc__b">
                <h2>{x.n}</h2>
                <p className="note flush">{x.d}</p>
                <div className="jc__p">
                  <ProgressBar value={n} max={x.a.length} label={`${x.n}: التحديات المكتملة`} />
                  <span className="note">{n ? `${n} من ${x.a.length}` : 'ما بديت للحين'}</span>
                </div>
                <div className="row">
                  <button type="button" className="btn sm" onClick={() => setOpen(x.id)}><Compass size={15} aria-hidden="true" /> استكشف <ChevronLeft size={15} aria-hidden="true" /></button>
                  <button type="button" className="btn sm alt" aria-pressed={on} onClick={() => toggle(x.id)}>{on ? 'شيلها' : 'أضفها'}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
