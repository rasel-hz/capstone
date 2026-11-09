import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState } from '../../context/AppStateContext';
import { progressStats } from '../../features/progress/stats';
import { MilestoneIcon } from '../../features/streak/StreakBits';
import { canRest, MILESTONES, nextMilestone, recentDays, streakOf, takeRest, undoRest } from '../../features/streak/streak';
import { useCountUp } from '../../hooks/useCountUp';
import { formatDate, isRtl } from '../../i18n';
import { fillName } from '../../features/companion/name';
import { briefInput, fallbackBrief, requestBrief, type BriefText } from '../../features/progress/brief';
import { useStore } from '../../context/AppStateContext';
import { Check, Coffee, Moon, RefreshCw, ShieldCheck } from 'lucide-react';
import { today } from '../../utils';
import { fetchProgress, onProgressChanged, type RemoteProgress } from '../../services/progressSync';
import type { AppState, ViewId } from '../../types';

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

  return (
    <div className="pv">
      <PageHeader title={t('progress.title')} />
      <BriefHero s={s} />
      <WeekStreak s={s} />
      {s.progDone.length > 0 && <JourneyResults s={s} />}
    </div>
  );
}

// Zaho presents the week: the AI's headline and nudge come out of Zaho as a speech bubble.
// Written once a day and kept on the device; refreshed from the bubble. Without the AI, plain words stand in.
function BriefHero({ s }: { s: AppState }) {
  const { t } = useTranslation();
  const store = useStore();
  const v = streakOf(s);
  const hit = MILESTONES.some((m) => m.n === v.current) && v.todayDone;
  const mascot = useMascot(v.todayDone ? 'happy' : 'idle');
  // A brief saved before the headline format (no nudge field) is written again.
  const saved = s.brief && s.brief.d === today() && s.brief.lang === s.lang && s.brief.nudge !== undefined ? { headline: s.brief.text, nudge: s.brief.nudge } : null;
  const [brief, setBrief] = useState<BriefText | null>(saved);
  const [busy, setBusy] = useState(false);

  const write = useCallback(async () => {
    setBusy(true);
    const fresh = briefInput(s);
    try {
      const b = await requestBrief(fresh);
      setBrief(b);
      store.update((d) => { d.brief = { d: today(), lang: fresh.lang, text: b.headline, nudge: b.nudge }; });
      mascot.play('happy');
    } catch {
      // Not saved, so tomorrow (or a refresh) tries the AI again.
      setBrief(fallbackBrief(fresh));
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.lang]);

  useEffect(() => {
    if (!saved) void write();
    // Reaching a milestone today gets Zaho's celebration.
    else if (hit) mascot.play('celebrating');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="pv-hero" aria-labelledby="brief-t" aria-busy={busy}>
      <div className="pv-hero__buddy"><Mascot state={busy ? 'thinking' : mascot.state} size={128} /></div>
      <div className="pv-bubble">
        <p className="sr-only" id="brief-t">{t('progress.brief.title')}</p>
        <p className="pv-headline" dir="auto">{busy && !brief ? t('progress.brief.writing') : fillName(brief?.headline ?? '', s.name)}</p>
        {brief?.nudge && <p className="pv-nudge" dir="auto">{fillName(brief.nudge, s.name)}</p>}
        <button type="button" className="pv-refresh" disabled={busy} aria-label={t('progress.brief.refresh')} title={t('progress.brief.refresh')} onClick={() => void write()}><RefreshCw size={15} aria-hidden="true" /></button>
      </div>
    </section>
  );
}

const MARK_ICON = { done: Check, rest: Moon, protected: ShieldCheck } as const;

// The week is the page's centre: one large streak number, a quiet line with the other figures, and this
// week's seven days with their marks. The week before is one tap away, so all 14 days stay reachable.
function WeekStreak({ s }: { s: AppState }) {
  const { t } = useTranslation();
  const store = useStore();
  const [earlier, setEarlier] = useState(false);
  const v = streakOf(s);
  const all = recentDays(v, 14);
  const days = earlier ? all.slice(0, 7) : all.slice(7);
  const next = nextMilestone(v.current);
  const current = useCountUp(v.current, 700);
  const week = briefInput(s).stats.week;
  if (!s.streakOn) return null;
  return (
    <section className="pv-week" aria-labelledby="sk-t">
      <h2 className="sr-only" id="sk-t">{t('streak.title')}</h2>
      <div className="pv-week__head">
        <div className="pv-big"><b>{current}</b><span>{t('streak.current')}</span></div>
        {next && (
          <div className="pv-next" role="progressbar" aria-valuemin={0} aria-valuemax={next.n} aria-valuenow={v.current} aria-label={t('streak.next')}>
            <span className="pv-next__l"><MilestoneIcon id={next.id} /> {t('streak.next')} · {next.n} {t('streak.days', { count: next.n })}</span>
            <span className="pv-next__bar"><i style={{ width: `${Math.min(100, (v.current / next.n) * 100)}%` }} /></span>
          </div>
        )}
      </div>
      <p className="pv-facts">
        <span>{t('streak.longest')} <b>{v.longest}</b></span>
        <span><b>{week}</b> {t('progress.brief.week')}</span>
      </p>

      <ol className="pv-days" aria-label={t('streak.recent')}>
        {days.map(({ d, mark, today: isToday }) => {
          const Ic = mark === 'none' ? null : MARK_ICON[mark];
          const date = new Date(`${d}T12:00:00Z`);
          return (
            <li key={d} className={`pv-day pv-day--${mark} ${isToday ? 'is-today' : ''}`} aria-label={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${t(`streak.mark.${mark}`)}`}>
              <span className="pv-day__w" aria-hidden="true">{formatDate(date, { weekday: 'narrow' })}</span>
              <span className="pv-day__o" aria-hidden="true">{Ic ? <Ic size={16} /> : date.getUTCDate()}</span>
            </li>
          );
        })}
      </ol>
      <div className="pv-week__foot">
        <button type="button" className="pv-link" aria-pressed={earlier} onClick={() => setEarlier(!earlier)}>{t(earlier ? 'progress.week.this' : 'progress.week.before')}</button>
        <span className="pv-legend" aria-hidden="true">
          <span><Check size={12} /> {t('streak.mark.done')}</span>
          <span><Moon size={12} /> {t('streak.mark.rest')}</span>
          <span><ShieldCheck size={12} /> {t('streak.mark.protected')}</span>
        </span>
      </div>

      <div className="pv-rest">
        {v.todayRest ? (
          <button type="button" className="pv-chip" onClick={() => store.update((d) => undoRest(d))}><Moon size={14} aria-hidden="true" /> {t('streak.undoRest')}</button>
        ) : canRest(s) && (
          <button type="button" className="pv-chip" onClick={() => store.update((d) => { takeRest(d); })}><Coffee size={14} aria-hidden="true" /> {t('streak.rest')}</button>
        )}
        <span className="pv-rest__t">{t(v.todayRest ? 'streak.restOn' : 'streak.kind')}</span>
      </div>
    </section>
  );
}

// Each finished journey as its two ratings: where the user started and where they ended.
function JourneyResults({ s }: { s: AppState }) {
  const { t } = useTranslation();
  const arrow = isRtl() ? '\u2190' : '\u2192';
  return (
    <section className="pv-journeys" aria-labelledby="pj-t">
      <h2 className="pv-h" id="pj-t">{t('progress.programs.title')}</h2>
      <ul>
        {[...s.progDone].reverse().map((r) => (
          <li key={`${r.id}${r.end}`} className={r.after > r.before ? 'is-up' : ''} aria-label={`${t(`journeys.items.${r.id}.name`)}: ${t('progress.programs.row', { before: r.before, after: r.after })}`}>
            <b className="pv-j__name">{t(`journeys.items.${r.id}.name`)}</b>
            <span className="pv-j__nums" aria-hidden="true"><span>{r.before}</span><i>{arrow}</i><b>{r.after}</b></span>
            {r.after > r.before && <span className="pv-j__tag">{t('progress.programs.up')}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
