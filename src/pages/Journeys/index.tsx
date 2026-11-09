import { ArrowRight, Check, ChevronLeft, Compass, Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, ProgressBar } from '../../components/ui/kit';
import { useAppState, useStore } from '../../context/AppStateContext';
import { ChallengeArt, JourneyArt } from '../../features/challenges/ChallengeArt';
import { JOURNEYS } from '../../features/challenges/catalog';
import { RatingPicker } from '../../features/program/ProgramCard';
import { PROGRAM_DAYS, programSteps, startProgram } from '../../features/program/program';
import { useBackHandler } from '../../services/native';
import type { Journey, JourneyId, ViewId } from '../../types';

function JourneyDetail({ j, onBack, onNavigate }: { j: Journey; onBack(): void; onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const [asking, setAsking] = useState(false);
  const [before, setBefore] = useState<number | null>(null);
  const mine = s.prog?.id === j.id ? s.prog : null;
  const other = s.prog && !mine ? s.prog : null;
  const suggesting = s.needs.includes(j.id);
  useBackHandler(onBack);

  const toggleSuggest = () => store.update((d) => {
    d.needs = d.needs.includes(j.id) ? d.needs.filter((x) => x !== j.id) : [...d.needs, j.id];
    if (!d.needs.length) d.needs = ['gen'];
  });

  return (
    <>
      <button type="button" className="btn-link back" onClick={onBack}><ArrowRight size={17} className="flip" aria-hidden="true" /> {t('journeys.all')}</button>
      <header className={`jd__head jw jw--${j.id}`}>
        <div className="jd__art"><JourneyArt id={j.id} /></div>
        <div className="jd__txt">
          <h1>{t(`journeys.items.${j.id}.name`)}</h1>
          <p>{t(`journeys.items.${j.id}.desc`)}</p>
          {mine ? (
            <>
              <span className="tag tag--ok"><Check size={13} aria-hidden="true" /> {t('journeys.program.activeHere')}</span>
              <ProgressBar value={mine.days.length} max={PROGRAM_DAYS} label={t('journeys.program.daysLabel')} />
              <button type="button" className="btn sm" onClick={() => onNavigate('chal')}><Play size={14} aria-hidden="true" /> {t('journeys.backToChal')}</button>
            </>
          ) : !asking && (
            <button type="button" className="btn" onClick={() => setAsking(true)}><Compass size={16} aria-hidden="true" /> {t('journeys.program.startBtn')}</button>
          )}
        </div>
      </header>

      {asking && !mine && (
        <section className="panel prog-start" aria-labelledby="ps-t">
          <h2 id="ps-t">{t('journeys.program.startTitle')}</h2>
          <RatingPicker journey={j.id} value={before} onChange={setBefore} />
          {other && <p className="note">{t('journeys.program.replaceNote', { name: t(`journeys.items.${other.id}.name`) })}</p>}
          <div className="row">
            <button type="button" className="btn" disabled={before == null} onClick={() => { store.update((d) => startProgram(d, j.id, before!)); onNavigate('chal'); }}>{t('journeys.program.start')}</button>
            <button type="button" className="btn alt" onClick={() => setAsking(false)}>{t('journeys.program.back')}</button>
          </div>
        </section>
      )}

      <ol className="path">
        {programSteps(j.id).map((a, i) => {
          const isDone = !!mine && i < mine.days.length;
          const isNext = !!mine && i === mine.days.length;
          return (
            <li key={i} className={`path__n ${isDone ? 'is-done' : ''} ${isNext ? 'is-next' : ''}`}>
              <span className="path__dot" aria-hidden="true">{isDone ? <Check size={18} /> : i + 1}</span>
              <div className="path__card">
                <div className="path__art"><ChallengeArt id={a} /></div>
                <div className="grow">
                  <div className="tl__t">
                    <b>{t('journeys.program.dayN', { n: i + 1 })}: {t(`challenges.items.${a}.name`)}</b>
                    {isDone && <span className="tag tag--ok">{t('journeys.tagDone')}</span>}
                    {isNext && <span className="tag tag--cur">{t('journeys.tagNext')}</span>}
                  </div>
                  <p className="note flush">{t(`challenges.items.${a}.purpose`)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn-link" aria-pressed={suggesting} onClick={toggleSuggest}>{t(suggesting ? 'journeys.suggestOff' : 'journeys.suggestOn')}</button>
    </>
  );
}

export function Journeys({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const [open, setOpen] = useState<JourneyId | null>(null);
  const j = JOURNEYS.find((x) => x.id === open);
  if (j) return <JourneyDetail j={j} onBack={() => setOpen(null)} onNavigate={onNavigate} />;
  return (
    <>
      <button type="button" className="btn-link back" onClick={() => onNavigate('chal')}><ArrowRight size={17} className="flip" aria-hidden="true" /> {t('journeys.backToChal')}</button>
      <PageHeader title={t('journeys.title')} sub={t('journeys.sub')} />
      <div className="jgrid">
        {JOURNEYS.map((x) => {
          const mine = s.prog?.id === x.id ? s.prog : null;
          const name = t(`journeys.items.${x.id}.name`);
          return (
            <article key={x.id} className={`jc jw jw--${x.id} ${mine ? 'is-on' : ''}`}>
              <button type="button" className="jc__open" onClick={() => setOpen(x.id)} aria-label={t('journeys.exploreName', { name })}>
                <div className="jc__art"><JourneyArt id={x.id} /></div>
                {mine && <span className="tag tag--ok jc__badge"><Check size={13} aria-hidden="true" /> {t('journeys.program.activeHere')}</span>}
              </button>
              <div className="jc__b">
                <h2>{name}</h2>
                <p className="note flush">{t(`journeys.items.${x.id}.desc`)}</p>
                {mine && (
                  <div className="jc__p">
                    <ProgressBar value={mine.days.length} max={PROGRAM_DAYS} label={t('journeys.cardProgress', { name })} />
                    <span className="note">{t('journeys.ofTotal', { n: mine.days.length, total: PROGRAM_DAYS })}</span>
                  </div>
                )}
                <div className="row">
                  <button type="button" className="btn sm" onClick={() => setOpen(x.id)}><Compass size={15} aria-hidden="true" /> {t('journeys.explore')} <ChevronLeft size={15} className="flip" aria-hidden="true" /></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
