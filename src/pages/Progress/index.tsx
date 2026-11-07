import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader, Segmented } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState } from '../../context/AppStateContext';
import { ChallengeArt } from '../../features/challenges/ChallengeArt';
import { CHALLENGES } from '../../features/challenges/catalog';
import { progressStats } from '../../features/progress/stats';
import { useCountUp } from '../../hooks/useCountUp';
import { formatDate, formatList, isRtl } from '../../i18n';
import type { Attempt, ViewId } from '../../types';
import { level } from '../../utils';

const dayLabel = (ts: number) => formatDate(ts, { day: 'numeric', month: 'short' });

const Stat = ({ title, value, suffix = '', note }: { title: string; value: number; suffix?: string; note?: string }) => (
  <div className="tile"><span className="tile__t">{title}</span><b className="tile__v">{useCountUp(value)}{suffix}</b>{note && <span className="note">{note}</span>}</div>
);

// One series, so one hue. Thin rounded bars from a shared baseline, with a value on hover and focus.
function ActivityChart({ rows, max }: { rows: { label: string; full: string; count: number }[]; max: number }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<number | null>(null);
  const H = 110;
  const W = 320;
  const step = W / rows.length;
  const barW = Math.max(3, Math.min(22, step - 2));
  const y = (v: number) => (v / max) * H;
  const shown = hover != null ? rows[hover] : null;
  const rtl = isRtl();
  const summary = rows.filter((r) => r.count).map((r) => `${r.full}: ${r.count}`).join(t('common.listSep'));
  return (
    <div className="chart">
      <p className="chart__tip" aria-live="polite">{shown ? t('progress.chartValue', { day: shown.full, count: shown.count }) : t('progress.chartHint')}</p>
      <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label={t('progress.chartLabel', { summary: summary || t('progress.none') })}>
        <line x1="0" x2={W} y1={H} y2={H} stroke="#263D37" strokeOpacity=".15" />
        {rows.map((r, i) => {
          // Time follows the reading direction, so the oldest day starts where a line of text starts.
          const x = rtl ? W - (i + 1) * step : i * step;
          const h = r.count ? Math.max(4, y(r.count)) : 0;
          return (
            <g key={i}>
              {h > 0 && <path className="chart-bar" style={{ animationDelay: `${i * 12}ms` }} d={`M${x + (step - barW) / 2} ${H}v${-(h - 4)}q0-4 4-4h${barW - 8 > 0 ? barW - 8 : 0}q4 0 4 4v${h - 4}z`} fill={hover === i ? '#1F5E48' : '#28785B'} />}
              <rect x={x} y="0" width={step} height={H + 24} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)} />
              {r.label && <text x={x + step / 2} y={H + 16} fontSize="9.5" textAnchor="middle" fill="#5a736b">{r.label}</text>}
            </g>
          );
        })}
      </svg>
      <details className="chart__t">
        <summary>{t('progress.asTable')}</summary>
        <table>
          <thead><tr><th>{t('progress.day')}</th><th>{t('progress.completed')}</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td>{r.full}</td><td>{r.count}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}

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

export function Progress({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const st = progressStats(s);
  const [range, setRange] = useState<'week' | 'month'>('week');
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
  const reflections = s.hist.filter((h) => h.status === 'COMPLETED' && (h.id === 'calm' || h.id === 'calm_landscape') && (h.data as { help?: string } | undefined)?.help);
  const moods = s.hist.filter((h) => h.id === 'emotion_map' && h.status === 'COMPLETED').slice(-5).reverse();
  const starts = s.hist.filter((h) => h.id === 'start2' && h.status === 'COMPLETED').slice(-5).reverse();
  const helpCount = (k: string) => reflections.filter((h) => (h.data as { help: string }).help === k).length;
  const row = (a: Attempt[]) => median(a.map((h) => h.dur));

  return (
    <>
      <PageHeader title={t('progress.title')} sub={t('progress.sub')}>
        <Mascot state={mascot.state} size={72} />
      </PageHeader>

      <div className="tiles">
        <Stat title={t('progress.tileCompleted')} value={st.completed.length} note={t('progress.ofAttempts', { count: st.attempts.length })} />
        <Stat title={t('common.level')} value={level(s)} note={t('common.points', { count: s.xp })} />
        <Stat title={t('progress.tileRate')} value={st.completionRate ?? 0} suffix="%" note={t('progress.rateNote')} />
        {st.avgAccuracy == null
          ? <div className="tile"><span className="tile__t">{t('progress.tileAccuracy')}</span><b className="tile__v">-</b><span className="note">{t('progress.noAccuracy')}</span></div>
          : <Stat title={t('progress.tileAccuracy')} value={st.avgAccuracy} suffix="%" note={t('progress.accuracyNote')} />}
      </div>

      <section className="panel">
        <div className="panel__h">
          <h2>{t('progress.activity')}</h2>
          {st.hasMonth
            ? <Segmented<'week' | 'month'> label={t('progress.range')} value={range} options={[{ value: 'week', label: t('progress.week') }, { value: 'month', label: t('progress.month') }]} onChange={setRange} />
            : <span className="note">{t('progress.monthLater')}</span>}
        </div>
        <ActivityChart rows={range === 'month' && st.hasMonth ? st.month : st.days} max={range === 'month' && st.hasMonth ? st.maxMonth : st.maxDay} />
      </section>

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

      <section className="panel">
        <h2>{t('progress.selfTitle')}</h2>
        <p className="note">{t('progress.selfNote')}</p>
        <h3>{t('progress.energy')}</h3>
        {s.en.length ? <div className="tags">{s.en.slice(-7).map((e) => <span key={e.ts} className="tag">{t('progress.energyEntry', { day: dayLabel(e.ts), level: t(`progress.energyLevels.${e.e}`) })}</span>)}</div> : <p className="note">{t('progress.energyEmpty')}</p>}
        {reflections.length > 0 && (
          <>
            <h3>{t('progress.afterCalm')}</h3>
            <div className="tags">{['y', 's', 'n'].filter(helpCount).map((k) => <span key={k} className="tag">{t(`games.common.help.${k}`)}: {helpCount(k)}</span>)}</div>
          </>
        )}
        {moods.length > 0 && (
          <>
            <h3>{t('challenges.items.emotion_map.name')}</h3>
            <ul className="plain">{moods.map((h) => {
              const f = (h.data as { feelings?: string[] } | undefined)?.feelings ?? [];
              return <li key={h.ts}><span className="note">{dayLabel(h.ts)}</span> {formatList(f.map((k) => t(`games.emotion.feelings.${k}`)))}</li>;
            })}</ul>
          </>
        )}
        {starts.length > 0 && (
          <>
            <h3>{t('progress.tasksStarted')}</h3>
            <ul className="plain">{starts.map((h) => {
              const d = h.data as { step?: string; outcome?: string } | undefined;
              return <li key={h.ts}><bdi>{d?.step}</bdi> {d?.outcome && <span className="note">· {t(`games.start.outcomes.${d.outcome}`)}</span>}</li>;
            })}</ul>
          </>
        )}
      </section>

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
