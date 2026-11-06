import { useEffect } from 'react';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { CHALLENGES } from '../../features/challenges/catalog';
import { progressStats } from '../../features/progress/stats';
import { useCountUp } from '../../hooks/useCountUp';

const ENERGY = { high: 'عالية', mid: 'عادي', low: 'قليلة' };

const Stat = ({ title, value, suffix = '', tone }: { title: string; value: number; suffix?: string; tone?: string }) => (
  <div className="card"><h3>{title}</h3><p className={`stat ${tone || ''}`}>{useCountUp(value)}{suffix}</p></div>
);

export function Progress() {
  const s = useAppState();
  const store = useStore();
  const st = progressStats(s);
  const mascot = useMascot(st.attempts.length ? 'idle' : 'curious');

  useEffect(() => {
    if (st.completed.length) mascot.play('encouraging');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!st.attempts.length) {
    return (
      <>
        <h1>تطوري</h1>
        <div className="card center">
          <Mascot state={mascot.state} size={110} />
          <p>ما فيه بيانات لسا. أول ما تخلص تحدي يطلع تقدمك هنا.</p>
          <button type="button" className="btn" onClick={() => store.update((d) => { d.view = 'home'; })}>ابدأ مهمة اليوم</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="chat-head">
        <Mascot state={mascot.state} size={72} />
        <h1>تطوري</h1>
      </div>
      <div className="grid">
        <Stat title="مكتملة" value={st.completed.length} tone="em" />
        <Stat title="موقوفة / متخطاة" value={st.notFinished} />
        {st.avgAccuracy == null
          ? <div className="card"><h3>متوسط الدقة</h3><p className="stat lav">-</p></div>
          : <Stat title="متوسط الدقة" value={st.avgAccuracy} suffix="%" tone="lav" />}
        <Stat title="مجموع النقاط" value={s.xp} tone="gold" />
      </div>
      <div className="card">
        <h3>آخر ٧ أيام</h3>
        <svg viewBox="0 0 280 110" width="100%" role="img" aria-label={`المكتملة في آخر ٧ أيام: ${st.days.map((d) => d.count).join('، ')}`}>
          {st.days.map((d, i) => (
            <g key={i}>
              <rect className="chart-bar" style={{ animationDelay: `${i * 40}ms` }} x={i * 40 + 8} y={90 - (d.count / st.maxDay) * 70} width="26" height={Math.max(2, (d.count / st.maxDay) * 70)} rx="8" fill="#8DBFA3" />
              <text x={i * 40 + 21} y="106" fontSize="10" textAnchor="middle" fill="#263D37">{d.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="card">
        <h3>حسب التحدي</h3>
        {st.byChallenge.map(([k, a]) => {
          const x = a.filter((h) => h.acc != null);
          return <p key={k}>{CHALLENGES[k].t}: {a.length} مرة{x.length ? `، آخر دقة ${x[x.length - 1].acc}%` : ''}، متوسط الوقت {Math.round(a.reduce((n, h) => n + h.dur, 0) / a.length)} ث</p>;
        })}
      </div>
      <div className="card">
        <h3>الطاقة اللي سجلتها</h3>
        {s.en.length ? s.en.slice(-7).map((e) => <span key={e.ts} className="chip">{e.d.slice(4, 10)} · {ENERGY[e.e]}</span>) : <p className="note">ما سجلت شي لسا.</p>}
      </div>
      <div className="card">
        <h3>ملاحظات</h3>
        <p><b>معلوم:</b> أكملت {st.completed.length} من {st.attempts.length} محاولات.</p>
        {st.attempts.length >= 4 ? (
          <>
            <p><b>نمط ملحوظ:</b> {st.shortCount} من {st.completed.length} تحديات مكتملة أخذت دقيقة أو أقل.</p>
            <p><b>فرضية تحتاج تأكيدك:</b> يمكن التحديات القصيرة تناسبك أكثر. أنت اللي تقرر.</p>
          </>
        ) : <p className="note">نحتاج ٤ محاولات على الأقل قبل ما نذكر نمط.</p>}
        <p className="note">نتائج الألعاب للمتابعة الشخصية، وما تدل على تحسن علاجي أو تشخيص.</p>
      </div>
    </>
  );
}
