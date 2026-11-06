import { useEffect } from 'react';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { achievements, UNLOCKS } from '../../features/rewards/achievements';
import { useCountUp } from '../../hooks/useCountUp';
import { level } from '../../utils';

export function Rewards() {
  const s = useAppState();
  const store = useStore();
  const lvl = level(s);
  const list = achievements(s);
  const earned = list.filter((a) => a.earned).length;
  const mascot = useMascot('idle');
  const xp = useCountUp(s.xp);

  // Only real results trigger a reaction, so nothing celebrates unearned points.
  useEffect(() => {
    if (lvl >= 3) mascot.play('celebrating');
    else if (earned) mascot.play('happy');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <h1>مكافآتي</h1>
      <div className="card hero">
        <Mascot state={mascot.state} size={110} label="خويّك" interactive />
        <div>
          <h2 className="flush">المستوى {lvl}</h2>
          <p>{xp} نقطة · باقي {100 - (s.xp % 100)} للتالي</p>
        </div>
      </div>
      <h2>إنجازات</h2>
      <div>{list.map((a) => <span key={a.label} className={`chip ${a.earned ? 'on chip--earned' : ''}`}>{a.earned ? '✓' : '🔒'} {a.label}</span>)}</div>
      <h2>مفتوحات</h2>
      <div className="grid">
        {UNLOCKS.map((t) => (
          <div key={t.label} className="card lift">
            <h3>{t.label}</h3>
            <p className="note">{lvl >= t.level ? 'مفتوحة' : 'تنفتح عند المستوى ' + t.level}</p>
            {lvl >= t.level && t.theme && (
              <button type="button" className="btn sm" onClick={() => store.update((d) => { d.theme = d.theme ? '' : t.theme; })}>{s.theme ? 'ألغِ' : 'فعّل'}</button>
            )}
          </div>
        ))}
      </div>
      <p className="note">بدون سلاسل أيام. أيام الراحة جزء طبيعي من الرحلة. المكافآت داخل التطبيق فقط حاليًا.</p>
    </>
  );
}
