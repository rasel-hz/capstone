import { useEffect, useState } from 'react';
import { EmptyState, PageHeader, Segmented } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState } from '../../context/AppStateContext';
import { ChallengeArt } from '../../features/challenges/ChallengeArt';
import { CHALLENGES } from '../../features/challenges/catalog';
import { FEELINGS } from '../../features/challenges/games/EmotionMapGame';
import { progressStats } from '../../features/progress/stats';
import { useCountUp } from '../../hooks/useCountUp';
import type { Attempt, ViewId } from '../../types';
import { level } from '../../utils';

const ENERGY = { high: 'عالية', mid: 'عادي', low: 'قليلة' };
const HELP: Record<string, string> = { y: 'ارتحت', s: 'شوي', n: 'ما فرق' };
const OUTCOME: Record<string, string> = { started: 'بديت فيها', partial: 'بديت شوي', not: 'ما بديت' };

const Stat = ({ title, value, suffix = '', note }: { title: string; value: number; suffix?: string; note?: string }) => (
  <div className="tile"><span className="tile__t">{title}</span><b className="tile__v">{useCountUp(value)}{suffix}</b>{note && <span className="note">{note}</span>}</div>
);

// One series, so one hue. Thin rounded bars from a shared baseline, with a value on hover and focus.
function ActivityChart({ rows, max }: { rows: { label: string; full: string; count: number }[]; max: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 110;
  const W = 320;
  const step = W / rows.length;
  const barW = Math.max(3, Math.min(22, step - 2));
  const y = (v: number) => (v / max) * H;
  const shown = hover != null ? rows[hover] : null;
  return (
    <div className="chart">
      <p className="chart__tip" aria-live="polite">{shown ? `${shown.full}: ${shown.count} مكتملة` : 'مرّر على الأعمدة أو اضغطها لتشوف الرقم'}</p>
      <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label={`التحديات المكتملة: ${rows.filter((r) => r.count).map((r) => `${r.full} ${r.count}`).join('، ') || 'ما فيه'}`}>
        <line x1="0" x2={W} y1={H} y2={H} stroke="#263D37" strokeOpacity=".15" />
        {rows.map((r, i) => {
          // Time runs right to left, matching the reading direction, so the oldest day is on the right.
          const x = W - (i + 1) * step;
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
        <summary>شوفها كجدول</summary>
        <table>
          <thead><tr><th>اليوم</th><th>مكتملة</th></tr></thead>
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
  if (values.length < 2) return null;
  const pts = values.map((v, i) => `${100 - (i / (values.length - 1)) * 100},${28 - (v / 100) * 24}`).join(' ');
  return <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={`آخر النتائج: ${[...values].join('، ')}٪`}><polyline points={pts} fill="none" stroke="#28785B" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}

export function Progress({ onNavigate }: { onNavigate(v: ViewId): void }) {
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
        <PageHeader title="تطوري" />
        <div className="panel">
          <EmptyState art={<Mascot state={mascot.state} size={110} />} title="ما فيه بيانات للحين" text="أول ما تخلص تحدي، تطلع أرقامك الحقيقية هنا. ما نعرض أرقام تجريبية.">
            <button type="button" className="btn" onClick={() => onNavigate('home')}>ابدأ مهمة اليوم</button>
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
      <PageHeader title="تطوري" sub="أرقامك الفعلية من المحاولات المحفوظة على جهازك. للمتابعة الشخصية، مو تشخيص.">
        <Mascot state={mascot.state} size={72} />
      </PageHeader>

      <div className="tiles">
        <Stat title="تحديات مكتملة" value={st.completed.length} note={`من ${st.attempts.length} محاولة`} />
        <Stat title="المستوى" value={level(s)} note={`${s.xp} نقطة`} />
        <Stat title="نسبة الإكمال" value={st.completionRate ?? 0} suffix="%" note="مكتملة ÷ كل المحاولات المسجلة" />
        {st.avgAccuracy == null
          ? <div className="tile"><span className="tile__t">متوسط الدقة</span><b className="tile__v">-</b><span className="note">ما لعبت تحدي فيه دقة</span></div>
          : <Stat title="متوسط الدقة" value={st.avgAccuracy} suffix="%" note="من التحديات اللي فيها دقة" />}
      </div>

      <section className="panel">
        <div className="panel__h">
          <h2>نشاطك</h2>
          {st.hasMonth
            ? <Segmented<'week' | 'month'> label="المدة" value={range} options={[{ value: 'week', label: 'أسبوع' }, { value: 'month', label: 'شهر' }]} onChange={setRange} />
            : <span className="note">عرض الشهر يظهر لما يصير عندك أكثر من أسبوع.</span>}
        </div>
        <ActivityChart rows={range === 'month' && st.hasMonth ? st.month : st.days} max={range === 'month' && st.hasMonth ? st.maxMonth : st.maxDay} />
      </section>

      {scored.length > 0 && (
        <section className="panel">
          <h2>التحديات اللي فيها دقة</h2>
          <p className="note">كل تحدي يحسب الدقة بطريقته، فقارن التحدي بنفسه مو بغيره.</p>
          <ul className="perf">
            {scored.map(([id, a]) => {
              const vals = a.filter((h) => h.acc != null).map((h) => h.acc as number);
              return (
                <li key={id}>
                  <div className="perf__art"><ChallengeArt id={id} /></div>
                  <div className="grow"><b>{CHALLENGES[id].t}</b><p className="note flush">{a.length} مرة · متوسط {avg(vals)}% · آخر مرة {vals[vals.length - 1]}%</p></div>
                  <Spark values={vals.slice(-8)} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {unscored.length > 0 && (
        <section className="panel">
          <h2>التحديات اللي بدون دقة</h2>
          <p className="note">هذي ما فيها إجابة صحيحة، فما نقارنها بالتحديات اللي فوق.</p>
          <ul className="perf">
            {unscored.map(([id, a]) => (
              <li key={id}>
                <div className="perf__art"><ChallengeArt id={id} /></div>
                <div className="grow"><b>{CHALLENGES[id].t}</b><p className="note flush">{a.length} مرة · وقت معتاد {row(a)} ثانية</p></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h2>من كلامك أنت</h2>
        <p className="note">هذا اللي سجلته بنفسك، مو استنتاج مني.</p>
        <h3>الطاقة</h3>
        {s.en.length ? <div className="tags">{s.en.slice(-7).map((e) => <span key={e.ts} className="tag">{new Date(e.ts).toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'short' })} · {ENERGY[e.e]}</span>)}</div> : <p className="note">ما سجلت طاقتك للحين.</p>}
        {reflections.length > 0 && (
          <>
            <h3>بعد وقفات الهدوء</h3>
            <div className="tags">{Object.entries(HELP).filter(([k]) => helpCount(k)).map(([k, l]) => <span key={k} className="tag">{l}: {helpCount(k)}</span>)}</div>
          </>
        )}
        {moods.length > 0 && (
          <>
            <h3>وش جوّك</h3>
            <ul className="plain">{moods.map((h) => {
              const f = (h.data as { feelings?: string[] } | undefined)?.feelings ?? [];
              return <li key={h.ts}><span className="note">{new Date(h.ts).toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'short' })}</span> {FEELINGS.filter(([k]) => f.includes(k)).map(([, l]) => l).join('، ')}</li>;
            })}</ul>
          </>
        )}
        {starts.length > 0 && (
          <>
            <h3>مهام بديت فيها</h3>
            <ul className="plain">{starts.map((h) => {
              const d = h.data as { step?: string; outcome?: string } | undefined;
              return <li key={h.ts}>{d?.step} <span className="note">· {OUTCOME[d?.outcome ?? ''] ?? ''}</span></li>;
            })}</ul>
          </>
        )}
      </section>

      <section className="panel insight-box">
        <h2>ملاحظات خويّك</h2>
        <p><b>معلوم:</b> كمّلت {st.completed.length} من {st.attempts.length} محاولات.</p>
        {st.attempts.length >= 4 ? (
          <>
            <p><b>لاحظت من محاولاتك:</b> {st.shortCount} من {st.completed.length} تحديات مكتملة أخذت دقيقة أو أقل.</p>
            <p><b>يمكن:</b> التحديات القصيرة تناسبك أكثر. هذي فرضية، وأنت اللي تقرر.</p>
          </>
        ) : <p className="note">أحتاج ٤ محاولات على الأقل قبل ما أذكر أي نمط.</p>}
        <p className="note">نتائج الألعاب للمتابعة الشخصية، وما تدل على تحسن علاجي أو تشخيص.</p>
      </section>
    </>
  );
}
