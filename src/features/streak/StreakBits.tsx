import { Check, Coffee, Flame, Moon, ShieldCheck, Sparkles, Sprout, Star, Trophy, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fireConfetti } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import type { MascotState } from '../../components/mascot/manifest';
import { useAppState, useStore } from '../../context/AppStateContext';
import { formatDate } from '../../i18n';
import { canRest, MILESTONES, nextMilestone, pendingMilestone, recentDays, streakOf, takeRest, undoRest, type DayMark } from './streak';

const milestoneFor = (n: number) => [...MILESTONES].reverse().find((m) => n >= m.n) ?? null;

const MILESTONE_ICON: Record<string, LucideIcon> = { seed: Sprout, spark: Sparkles, flame: Flame, star: Star, trophy: Trophy };

export function MilestoneIcon({ id, size = 14 }: { id: string; size?: number }) {
  const Ic = MILESTONE_ICON[id];
  return <Ic className="sk-ic" size={size} aria-hidden="true" />;
}

/** The compact streak shown on Home and the journey header. Hidden when the user turned streaks off. */
export function StreakChip() {
  const { t } = useTranslation();
  const s = useAppState();
  if (!s.streakOn) return null;
  const { current } = streakOf(s);
  const m = milestoneFor(current);
  return (
    <span className="sk-chip" aria-label={t('streak.chip', { n: current })}>
      {m && <MilestoneIcon id={m.id} />}
      <b>{current}</b> <span className="note">{t('streak.days', { count: current })}</span>
    </span>
  );
}

const MARK_ICON: Record<Exclude<DayMark, 'none'>, typeof Check> = { done: Check, rest: Moon, protected: ShieldCheck };

/** The streak with its recent days. Each day has a symbol and a label, so it doesn't rely on colour. */
export function StreakCard() {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  if (!s.streakOn) return null;
  const v = streakOf(s);
  const days = recentDays(v);
  const next = nextMilestone(v.current);
  return (
    <section className="pv-sec pv-streak" aria-labelledby="sk-t">
      <h2 className="pv-h" id="sk-t">{t('streak.title')}</h2>
      <div className="pv-streak__top">
        <div className="pv-big">
          <b>{v.current}</b>
          <span>{t('streak.current')}</span>
        </div>
        <dl className="pv-side">
          <div><dt>{t('streak.longest')}</dt><dd>{v.longest}</dd></div>
          {next && <div><dt>{t('streak.next')}</dt><dd><MilestoneIcon id={next.id} /> {next.n} {t('streak.days', { count: next.n })}</dd></div>}
        </dl>
      </div>
      {next && (
        <div className="pv-meter" role="progressbar" aria-valuemin={0} aria-valuemax={next.n} aria-valuenow={v.current} aria-label={t('streak.next')}>
          <i style={{ width: `${Math.min(100, (v.current / next.n) * 100)}%` }} />
        </div>
      )}
      <ol className="sk-days" aria-label={t('streak.recent')}>
        {days.map(({ d, mark, today }) => {
          const Ic = mark === 'none' ? null : MARK_ICON[mark];
          const date = new Date(`${d}T12:00:00Z`);
          return (
            <li key={d} className={`sk-d sk-d--${mark} ${today ? 'is-today' : ''}`} aria-label={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${t(`streak.mark.${mark}`)}`}>
              <span className="sk-d__o">{Ic && <Ic size={13} aria-hidden="true" />}</span>
              <span className="sk-d__n" aria-hidden="true">{date.getUTCDate()}</span>
            </li>
          );
        })}
      </ol>
      <p className="sk-legend note">
        <span><Check size={12} aria-hidden="true" /> {t('streak.mark.done')}</span>
        <span><Moon size={12} aria-hidden="true" /> {t('streak.mark.rest')}</span>
        <span><ShieldCheck size={12} aria-hidden="true" /> {t('streak.mark.protected')}</span>
      </p>
      <div className="pv-rest">
        {v.todayRest ? (
          <button type="button" className="btn sm alt" onClick={() => store.update((d) => undoRest(d))}>{t('streak.undoRest')}</button>
        ) : canRest(s) && (
          <button type="button" className="btn sm alt" onClick={() => store.update((d) => { takeRest(d); })}><Coffee size={14} aria-hidden="true" /> {t('streak.rest')}</button>
        )}
        <p className="note flush">{t(v.todayRest ? 'streak.restOn' : 'streak.kind')}</p>
      </div>
    </section>
  );
}

const MOOD: Record<number, MascotState> = { 1: 'greeting', 3: 'happy', 7: 'celebrating', 14: 'celebrating', 30: 'celebrating' };

/** On the finish screen: the streak, and a one-time celebration when a milestone is reached. */
export function StreakDone() {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const [hit] = useState(() => pendingMilestone(s));
  useEffect(() => {
    if (!hit) return;
    store.update((d) => { d.streakSeen = Math.max(d.streakSeen, hit.n); });
    if (hit.n >= 7) fireConfetti(!!store.getState().rm);
    // Runs once for this finish screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!s.streakOn) return null;
  const v = streakOf(s);
  if (!hit) return v.todayDone ? <p className="sk-line"><StreakChip /></p> : null;
  return (
    <div className={`sk-hit sk-hit--${hit.id}`} role="status">
      {hit.n >= 7 && <span className="sk-sparks" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>}
      <Mascot state={MOOD[hit.n]} size={84} />
      <div>
        <b className="sk-hit__t"><MilestoneIcon id={hit.id} size={17} /> {t(`streak.m.${hit.id}.title`)}</b>
        <p className="note flush">{t(`streak.m.${hit.id}.text`)}</p>
      </div>
    </div>
  );
}
