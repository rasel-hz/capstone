import { Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState } from '../../context/AppStateContext';
import { ChallengeArt } from '../../features/challenges/ChallengeArt';
import { CHALLENGES } from '../../features/challenges/catalog';
import { fullDaysIn } from '../../features/buddy/buddy';
import { progressStats } from '../../features/progress/stats';
import { StreakCard } from '../../features/streak/StreakBits';
import { fetchProgress, onProgressChanged, type RemoteProgress } from '../../services/progressSync';
import { formatDate, isRtl } from '../../i18n';
import type { AppState, Attempt, ViewId } from '../../types';

const avg = (a: number[]) => Math.round(a.reduce((n, v) => n + v, 0) / a.length);
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

function Spark({ values }: { values: number[] }) {
  const { t } = useTranslation();
  if (values.length < 2) return null;
  const rtl = isRtl();
  const pts = values.map((v, i) => {
    const p = (i / (values.length - 1)) * 100;
    return `${rtl ? 100 - p : p},${28 - (v / 100) * 24}`;
  }).join(' ');
  return <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={t('progress.sparkLabel', { values: values.join(t('common.listSep')) })}><polyline points={pts} fill="none" stroke="#28785B" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}

// Everything on this page comes from Supabase. The device's copy is used only for settings such as the
// language and reduced motion, never for the numbers.
function useRemoteProgress() {
  const [data, setData] = useState<RemoteProgress | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    try {
      setData(await fetchProgress());
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    void load();
    return onProgressChanged(() => void load());
  }, [load]);
  return { data, error, load };
}

export function Progress({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const local = useAppState();
  const { data, error, load } = useRemoteProgress();
  if (error || !data) {
    return (
      <>
        <PageHeader title={t('progress.title')} />
        {error ? (
          <div className="panel center" role="alert">
            <p>{t('progress.remote.error')}</p>
            <button type="button" className="btn sm" onClick={() => void load()}>{t('progress.remote.retry')}</button>
          </div>
        ) : <div className="panel center" role="status"><p className="note">{t('progress.remote.loading')}</p></div>}
      </>
    );
  }
  return <ProgressView onNavigate={onNavigate} s={{ ...local, ...data }} />;
}

function ProgressView({ onNavigate, s }: { onNavigate(v: ViewId): void; s: AppState }) {
  const { t } = useTranslation();
  const st = progressStats(s);
  const mascot = useMascot(st.attempts.length ? 'idle' : 'curious');

  useEffect(() => {
    if (st.completed.length) mascot.play('encouraging');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!st.attempts.length) {
    return (
      <>
        <PageHeader title={t('progress.title')} />
        <div className="panel">
          <EmptyState art={<Mascot state={mascot.state} size={110} />} title={t('progress.emptyTitle')} text={t('progress.emptyText')}>
            <button type="button" className="btn" onClick={() => onNavigate('home')}>{t('progress.emptyAction')}</button>
          </EmptyState>
        </div>
      </>
    );
  }

  const scored = st.byChallenge.filter(([id]) => CHALLENGES[id].scored);
  const unscored = st.byChallenge.filter(([id]) => !CHALLENGES[id].scored && !CHALLENGES[id].selfReport);
  const row = (a: Attempt[]) => median(a.map((h) => h.dur));

  return (
    <>
      <PageHeader title={t('progress.title')} sub={t('progress.sub')}>
        <Mascot state={mascot.state} size={72} />
      </PageHeader>
      <StreakCard />

      {s.fullDays.length > 0 && (() => {
        const week = fullDaysIn(s);
        return (
          <section className="panel">
            <h2>{t('progress.fullDays.title')}</h2>
            <p className="flush">{t('progress.fullDays.week', { n: week.filter((d) => d.full).length })}</p>
            <ol className="fdays">
              {week.map(({ date, full }) => {
                const day = formatDate(date, { weekday: 'short' });
                return <li key={date.toDateString()} className={full ? 'is-full' : ''} aria-label={t(full ? 'progress.fullDays.dayFull' : 'progress.fullDays.dayNot', { day })}><i aria-hidden="true">{full ? <Zap size={14} /> : null}</i><span aria-hidden="true">{day}</span></li>;
              })}
            </ol>
            <p className="note flush">{t('progress.fullDays.note')}</p>
          </section>
        );
      })()}

      {s.progDone.length > 0 && (
        <section className="panel">
          <h2>{t('progress.programs.title')}</h2>
          <p className="note">{t('progress.programs.note')}</p>
          <ul className="pres-list">
            {[...s.progDone].reverse().map((r) => (
              <li key={`${r.id}${r.end}`}>
                <b>{t(`journeys.items.${r.id}.name`)}</b>
                <span className={r.after > r.before ? 'pres-list__up' : ''}>{t('progress.programs.row', { before: r.before, after: r.after })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {scored.length > 0 && (
        <section className="panel">
          <h2>{t('progress.scoredTitle')}</h2>
          <p className="note">{t('progress.scoredNote')}</p>
          <ul className="perf">
            {scored.map(([id, a]) => {
              const vals = a.filter((h) => h.acc != null).map((h) => h.acc as number);
              return (
                <li key={id}>
                  <div className="perf__art"><ChallengeArt id={id} /></div>
                  <div className="grow"><b>{t(`challenges.items.${id}.name`)}</b><p className="note flush">{t('progress.scoredRow', { times: t('challenges.times', { count: a.length }), avg: avg(vals), last: vals[vals.length - 1] })}</p></div>
                  <Spark values={vals.slice(-8)} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {unscored.length > 0 && (
        <section className="panel">
          <h2>{t('progress.unscoredTitle')}</h2>
          <p className="note">{t('progress.unscoredNote')}</p>
          <ul className="perf">
            {unscored.map(([id, a]) => (
              <li key={id}>
                <div className="perf__art"><ChallengeArt id={id} /></div>
                <div className="grow"><b>{t(`challenges.items.${id}.name`)}</b><p className="note flush">{t('progress.unscoredRow', { times: t('challenges.times', { count: a.length }), time: t('common.seconds', { count: row(a) }) })}</p></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel insight-box">
        <h2>{t('progress.notesTitle')}</h2>
        <p><b>{t('progress.known')}</b> {t('progress.knownText', { done: st.completed.length, total: st.attempts.length })}</p>
        {st.attempts.length >= 4 ? (
          <>
            <p><b>{t('progress.noticed')}</b> {t('progress.noticedText', { short: st.shortCount, total: st.completed.length })}</p>
            <p><b>{t('progress.maybe')}</b> {t('progress.maybeText')}</p>
          </>
        ) : <p className="note">{t('progress.needMore')}</p>}
        <p className="note">{t('progress.disclaimer')}</p>
      </section>
    </>
  );
}
