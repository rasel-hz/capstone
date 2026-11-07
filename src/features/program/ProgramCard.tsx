import { Check, Clock, Compass, Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Segmented } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import type { JourneyId, ProgramResult, ViewId } from '../../types';
import { CHALLENGES } from '../challenges/catalog';
import { ChallengeArt } from '../challenges/ChallengeArt';
import { useMissions } from '../mission/MissionProvider';
import { allDaysDone, currentStep, doneToday, finishProgram, leaveProgram, PROGRAM_DAYS, RATINGS } from './program';

/** The 1 to 5 self-rating, asked on the first and the last day. */
export function RatingPicker({ journey, value, onChange }: { journey: JourneyId; value: number | null; onChange(v: number): void }) {
  const { t } = useTranslation();
  return (
    <div className="rate">
      <p className="rate__q">{t(`journeys.items.${journey}.ask`)}</p>
      <Segmented<number> className="seg--rate" label={t('journeys.program.rateLabel')} value={value} options={RATINGS.map((n) => ({ value: n, label: String(n) }))} onChange={onChange} />
      <p className="rate__scale note flush"><span>{t('journeys.program.scaleLow')}</span><span>{t('journeys.program.scaleHigh')}</span></p>
    </div>
  );
}

export function ProgramResultView({ r }: { r: ProgramResult }) {
  const { t } = useTranslation();
  const name = t(`journeys.items.${r.id}.name`);
  const key = r.after > r.before ? 'up' : r.after === r.before ? 'same' : 'down';
  return (
    <div className="pres">
      <h3>{t('journeys.program.resultTitle', { name })}</h3>
      <div className="pres__cols">
        <div><span className="note">{t('journeys.program.before')}</span><b>{r.before}</b></div>
        <div><span className="note">{t('journeys.program.after')}</span><b>{r.after}</b></div>
      </div>
      <p className="flush">{t(`journeys.program.${key}`, { before: r.before, after: r.after })}</p>
      <p className="note flush">{t('journeys.program.selfNote')}</p>
    </div>
  );
}

// The top of the challenges page: the journey in progress and today's single step, or an invitation to pick one.
export function ProgramCard({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const missions = useMissions();
  const [after, setAfter] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [result, setResult] = useState<ProgramResult | null>(null);
  const p = s.prog;

  if (result) {
    return (
      <section className="next prog-card" aria-label={t('journeys.program.eyebrow')}>
        <ProgramResultView r={result} />
        <div className="next__act">
          <button type="button" className="btn sm" onClick={() => { setResult(null); onNavigate('journeys'); }}><Compass size={15} aria-hidden="true" /> {t('journeys.program.again')}</button>
        </div>
      </section>
    );
  }

  if (!p) {
    return (
      <section className="next prog-card prog-card--empty" aria-labelledby="prog-t">
        <p className="eyebrow">{t('journeys.program.eyebrow')}</p>
        <h2 id="prog-t">{t('journeys.program.emptyTitle')}</h2>
        <p className="note flush">{t('journeys.program.emptyText')}</p>
        <div className="next__act">
          <button type="button" className="btn" onClick={() => onNavigate('journeys')}><Compass size={16} aria-hidden="true" /> {t('journeys.program.choose')}</button>
        </div>
      </section>
    );
  }

  const name = t(`journeys.items.${p.id}.name`);
  const dots = (
    <ol className="pdots" aria-label={t('journeys.program.daysLabel')}>
      {Array.from({ length: PROGRAM_DAYS }, (_, i) => (
        <li key={i} className={i < p.days.length ? 'is-done' : ''} aria-label={t('journeys.program.dayN', { n: i + 1 })}>{i < p.days.length ? <Check size={12} aria-hidden="true" /> : i + 1}</li>
      ))}
    </ol>
  );

  if (allDaysDone(p)) {
    return (
      <section className="next prog-card" aria-labelledby="prog-t">
        <p className="eyebrow">{name}</p>
        <div className="prog-card__end">
          <Mascot state="happy" size={64} />
          <h2 id="prog-t">{t('journeys.program.endTitle')}</h2>
        </div>
        {dots}
        <RatingPicker journey={p.id} value={after} onChange={setAfter} />
        <div className="next__act">
          <button type="button" className="btn" disabled={after == null} onClick={() => {
            const r: ProgramResult = { id: p.id, before: p.before, after: after!, end: '' };
            store.update((d) => finishProgram(d, after!));
            setResult(r);
          }}>{t('journeys.program.endSave')}</button>
        </div>
      </section>
    );
  }

  const step = currentStep(p);
  const done = doneToday(p);
  const stepName = t(`challenges.items.${step.id}.name`);
  return (
    <section className="next prog-card" aria-labelledby="prog-t">
      <p className="eyebrow">{t('journeys.program.eyebrow')}</p>
      <h2 id="prog-t">{name}</h2>
      <p className="note flush">{t('journeys.program.dayOf', { day: step.day, total: PROGRAM_DAYS })}</p>
      {dots}
      <div className="next__row">
        <div className="next__art"><ChallengeArt id={step.id} /></div>
        <div className="grow">
          <p className="eyebrow flush">{t('journeys.program.todayStep')}</p>
          <p className="next__name">{stepName}</p>
          <p className="next__meta"><Clock size={14} aria-hidden="true" /> {t('common.minutes', { count: CHALLENGES[step.id].min })}</p>
        </div>
      </div>
      {done ? (
        <p className="prog-card__done"><Check size={16} aria-hidden="true" /> {t('journeys.program.doneToday')}</p>
      ) : (
        <div className="next__act">
          <button type="button" className="btn btn--lg" disabled={!!s.driving} onClick={() => missions.start([{ id: step.id, why: [{ k: 'fromJourney', journey: p.id }], diff: 'normal' }])}>
            <Play size={17} aria-hidden="true" /> {t('journeys.program.play')}
          </button>
        </div>
      )}
      <p className="note flush">{t('journeys.program.noRush')}</p>
      {leaving ? (
        <div className="prog-card__leave" role="group" aria-label={t('journeys.program.leave')}>
          <p className="flush">{t('journeys.program.leaveQ')}</p>
          <div className="row">
            <button type="button" className="btn sm alt" onClick={() => setLeaving(false)}>{t('journeys.program.keep')}</button>
            <button type="button" className="btn sm alt" onClick={() => { store.update(leaveProgram); setLeaving(false); }}>{t('journeys.program.leaveYes')}</button>
          </div>
        </div>
      ) : (
        <div className="row prog-card__links">
          <button type="button" className="btn-link" onClick={() => onNavigate('journeys')}>{t('journeys.program.change')}</button>
          <button type="button" className="btn-link" onClick={() => setLeaving(true)}>{t('journeys.program.leave')}</button>
        </div>
      )}
    </section>
  );
}
