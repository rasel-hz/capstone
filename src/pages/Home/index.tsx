import { useEffect, useState } from 'react';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { CHALLENGES } from '../../features/challenges/catalog';
import { currentItem, hasOpenMission } from '../../features/mission/engine';
import { useMissions } from '../../features/mission/MissionProvider';
import { generateMission, inPrayerWindow, isLowEnergy } from '../../features/mission/planner';
import type { EnergyLevel } from '../../types';
import { level, today } from '../../utils';

const CONTEXT_LABELS = { event: 'عزيمة / مناسبة', work: 'دوام أو دراسة', sleep: 'نوم متأخر' };
const ENERGY: [EnergyLevel, string][] = [['high', 'طاقتي عالية'], ['mid', 'عادي'], ['low', 'مالي خلق']];
let greeted = false;

export function Home() {
  const s = useAppState();
  const store = useStore();
  const missions = useMissions();
  const low = isLowEnergy(s);
  const mascot = useMascot(low ? 'resting' : 'idle');
  const [prayer, setPrayer] = useState(s.prayer);
  const h = new Date().getHours();
  const greeting = h < 12 ? 'صباح الخير' : h < 17 ? 'مساء النور' : 'مساء الخير';
  const open = hasOpenMission(s);
  const planned = generateMission(s);
  const doneToday = !!s.lastDaily && s.lastDaily.d === today();
  const latest = s.en[s.en.length - 1];

  useEffect(() => {
    if (greeted || s.driving) return;
    mascot.play('greeting');
    const t = setTimeout(() => { greeted = true; });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mascot.play]);

  function checkIn(e: EnergyLevel) {
    store.update((d) => {
      d.en = d.en.filter((y) => y.d !== today());
      d.en.push({ d: today(), e, ts: Date.now() });
    });
    if (e === 'high') mascot.play('happy');
  }

  const title = s.driving ? '🚗 وقت القيادة' : inPrayerWindow(s) ? '🕌 وقت صلاة' : doneToday ? (s.lastDaily!.all ? 'خلصت مهمة اليوم 🎉' : 'انتهت مهمة اليوم') : '٣ تحديات متتالية، تبدأها مرة وحدة';

  return (
    <>
      <div className="card hero">
        <Mascot state={mascot.state} size={130} label="خويّك" interactive />
        <div className="grow">
          <h1>هلا والله {s.name}! {greeting} ☀️</h1>
          <p>{low ? 'يا بعدي، اليوم نمشيها خفيف.' : 'وش علومك اليوم؟'}</p>
          <div>
            {ENERGY.map(([id, label]) => {
              const on = !!latest && latest.d === today() && latest.e === id;
              return <button key={id} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => checkIn(id)}>{label}</button>;
            })}
          </div>
        </div>
      </div>
      <div className="card">
        <b>المستوى {level(s)}</b> <span className="note">· باقي {100 - (s.xp % 100)} نقطة للتالي</span>
        <div className="bar" role="progressbar" aria-valuenow={s.xp % 100} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${s.xp % 100}%` }} /></div>
      </div>
      {open && (
        <div className="card resume-card">
          <h3>يا هلا برجعتك! آخر مرة وقفنا عند "{CHALLENGES[currentItem(s)!.id].t}"</h3>
          <p>وش رايك نكمله سوا؟</p>
          <button type="button" className="btn sm" onClick={() => missions.resume('continue')}>كمّل</button>{' '}
          <button type="button" className="btn sm alt" onClick={() => missions.resume('restart')}>ابدأ من أول</button>{' '}
          <button type="button" className="btn sm alt" onClick={() => missions.resume('easier')}>نسخة أسهل</button>{' '}
          <button type="button" className="btn sm alt" onClick={() => missions.resume('skip')}>تخطّى</button>
        </div>
      )}
      <div className="card mission-card">
        <span className="chip on">مهمة اليوم</span>
        <h2 className="mission-title">{title}</h2>
        {planned.map((g, i) => (
          <div key={i} className="it">
            <h3>{i + 1}. {CHALLENGES[g.id].t}</h3>
            <p className="note">{g.diff === 'easy' ? 'نسخة أسهل · ' : ''}{g.why}</p>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => missions.start()}>{open ? 'كمّل المهمة' : doneToday ? 'مهمة ثانية' : 'ابدأ المهمة'}</button>
      </div>
      <div className="grid">
        <div className="card">
          <h3>🕌 الصلاة</h3>
          <p className="note">{s.prayer ? `الصلاة القادمة ${s.prayer}، وأحمي ${s.pp} دقيقة بعدها.` : 'أدخل وقت الصلاة القادمة وأحميه لك.'} (إدخال يدوي، بدون ربط بخدمة مواقيت)</p>
          <div className="row">
            <input type="time" aria-label="وقت الصلاة القادمة" value={prayer} onChange={(e) => setPrayer(e.target.value)} />
            <button type="button" className="btn sm" onClick={() => store.update((d) => { d.prayer = prayer; })}>حفظ</button>
          </div>
        </div>
        <div className="card">
          <h3>🚗 القيادة</h3>
          <p className="note">المرور غير مربوط. أنت تخبرني.</p>
          <label className="check"><input type="checkbox" checked={!!s.driving} onChange={(e) => store.update((d) => { d.driving = e.target.checked ? 1 : 0; })} /> أنا أسوق الحين</label>
          <div className="row">
            <span className="note">ساعات قيادة اليوم</span>
            <input type="number" min={0} max={12} className="num-input" aria-label="ساعات قيادة اليوم" value={s.drive} onChange={(e) => { const v = +e.target.value; store.update((d) => { d.drive = v; }); }} />
          </div>
          {s.drive >= 2 && <p>يا بعدي، سقت واجد اليوم. أول ما توصل بالسلامة خذ لك بريك.</p>}
        </div>
        <div className="card">
          <h3>📅 اللي سجّلته</h3>
          <p className="note">التقويم غير مربوط. اللي تقوله في المحادثة وتوافق عليه يظهر هنا.</p>
          {s.ctx.length ? s.ctx.map((c) => <span key={c} className="chip">{CONTEXT_LABELS[c]}</span>) : <p className="note">ما سجلت شي لسا.</p>}
        </div>
      </div>
    </>
  );
}
