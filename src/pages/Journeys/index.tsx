import { ArrowRight, Check, ChevronLeft, Compass, Play, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, ProgressBar } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { ChallengeArt, JourneyArt } from '../../features/challenges/ChallengeArt';
import { JOURNEYS } from '../../features/challenges/catalog';
import { useMissions } from '../../features/mission/MissionProvider';
import { useBackHandler } from '../../services/native';
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
  const { t } = useTranslation();
  const s = useAppState();
  const missions = useMissions();
  const toggle = useToggle();
  const done = tried(s, j);
  const nextId = j.a.find((a) => !done.includes(a));
  const on = s.needs.includes(j.id);
  useBackHandler(onBack);
  return (
    <>
      <button type="button" className="btn-link back" onClick={onBack}><ArrowRight size={17} className="flip" aria-hidden="true" /> {t('journeys.all')}</button>
      <header className={`jd__head jw jw--${j.id}`}>
        <div className="jd__art"><JourneyArt id={j.id} /></div>
        <div className="jd__txt">
          <h1>{t(`journeys.items.${j.id}.name`)}</h1>
          <p>{t(`journeys.items.${j.id}.desc`)}</p>
          <ProgressBar value={done.length} max={j.a.length} label={t('journeys.progressLabel')} />
          <p className="note">{done.length ? t('journeys.doneOf', { n: done.length, total: j.a.length }) : t('journeys.notStartedOf', { count: j.a.length })}</p>
          <button type="button" className={`btn sm ${on ? 'alt' : ''}`} aria-pressed={on} onClick={() => toggle(j.id)}>{on ? <><Check size={15} aria-hidden="true" /> {t('journeys.activeBtn')}</> : <><Plus size={15} aria-hidden="true" /> {t('journeys.addLong')}</>}</button>
        </div>
      </header>
      <p className="note">{t('journeys.disclaimerDetail')}</p>
      <ol className="path">
        {j.a.map((a, i) => {
          const isDone = done.includes(a);
          const isNext = a === nextId;
          const name = t(`challenges.items.${a}.name`);
          return (
            <li key={a} className={`path__n ${isDone ? 'is-done' : ''} ${isNext ? 'is-next' : ''}`}>
              <span className="path__dot" aria-hidden="true">{isDone ? <Check size={18} /> : i + 1}</span>
              <div className="path__card">
                <div className="path__art"><ChallengeArt id={a} /></div>
                <div className="grow">
                  <div className="tl__t">
                    <b>{name}</b>
                    {isDone && <span className="tag tag--ok">{t('journeys.tagDone')}</span>}
                    {isNext && <span className="tag tag--cur">{t('journeys.tagNext')}</span>}
                  </div>
                  <p className="note flush">{t(`challenges.items.${a}.purpose`)}</p>
                </div>
                <button type="button" className={`btn sm ${isNext ? '' : 'alt'}`} aria-label={t('challenges.playName', { name })} onClick={() => missions.start([{ id: a, why: [{ k: 'fromJourney', journey: j.id }], diff: 'normal' }])}><Play size={14} aria-hidden="true" /> {t('challenges.play')}</button>
              </div>
            </li>
          );
        })}
      </ol>
      {!nextId && (
        <div className="path__end">
          <Mascot state="happy" size={80} />
          <div><h3><Sparkles size={16} aria-hidden="true" /> {t('journeys.allDone')}</h3><p className="note flush">{t('journeys.allDoneNote')}</p></div>
        </div>
      )}
    </>
  );
}

export function Journeys() {
  const { t } = useTranslation();
  const s = useAppState();
  const toggle = useToggle();
  const [open, setOpen] = useState<JourneyId | null>(null);
  const j = JOURNEYS.find((x) => x.id === open);
  if (j) return <JourneyDetail j={j} onBack={() => setOpen(null)} />;
  return (
    <>
      <PageHeader title={t('journeys.title')} sub={t('journeys.sub')} />
      <div className="jgrid">
        {JOURNEYS.map((x) => {
          const on = s.needs.includes(x.id);
          const n = tried(s, x).length;
          const name = t(`journeys.items.${x.id}.name`);
          return (
            <article key={x.id} className={`jc jw jw--${x.id} ${on ? 'is-on' : ''}`}>
              <button type="button" className="jc__open" onClick={() => setOpen(x.id)} aria-label={t('journeys.exploreName', { name })}>
                <div className="jc__art"><JourneyArt id={x.id} /></div>
                {on && <span className="tag tag--ok jc__badge"><Check size={13} aria-hidden="true" /> {t('journeys.active')}</span>}
              </button>
              <div className="jc__b">
                <h2>{name}</h2>
                <p className="note flush">{t(`journeys.items.${x.id}.desc`)}</p>
                <div className="jc__p">
                  <ProgressBar value={n} max={x.a.length} label={t('journeys.cardProgress', { name })} />
                  <span className="note">{n ? t('journeys.ofTotal', { n, total: x.a.length }) : t('journeys.notStarted')}</span>
                </div>
                <div className="row">
                  <button type="button" className="btn sm" onClick={() => setOpen(x.id)}><Compass size={15} aria-hidden="true" /> {t('journeys.explore')} <ChevronLeft size={15} className="flip" aria-hidden="true" /></button>
                  <button type="button" className="btn sm alt" aria-pressed={on} onClick={() => toggle(x.id)}>{t(on ? 'journeys.remove' : 'journeys.add')}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
