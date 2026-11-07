import { BarChart3, BatteryFull, BatteryLow, BatteryMedium, Clock, Coffee, Gamepad2, MapPin, MessageCircle, Play, Settings2, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IconBadge, ProgressBar, SectionTitle, Segmented } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { CHALLENGES } from '../../features/challenges/catalog';
import { currentItem, hasOpenMission } from '../../features/mission/engine';
import { MissionTimeline } from '../../features/mission/MissionTimeline';
import { useMissions } from '../../features/mission/MissionProvider';
import { generateMission, inPrayerWindow, isLowEnergy, missionReason } from '../../features/mission/planner';
import { progressStats } from '../../features/progress/stats';
import { useCountUp } from '../../hooks/useCountUp';
import type { EnergyLevel, ViewId } from '../../types';
import { level, today } from '../../utils';

const CONTEXT_LABELS = { event: 'عندك عزيمة أو مناسبة', work: 'عندك دوام أو دراسة', sleep: 'نومك كان متأخر' };
const SCHED = { work: 'دوام', study: 'دراسة', flex: 'يوم مرن' } as Record<string, string>;
const ENERGY: { value: EnergyLevel; label: string; icon: LucideIcon }[] = [
  { value: 'high', label: 'طاقتي عالية', icon: BatteryFull },
  { value: 'mid', label: 'عادي', icon: BatteryMedium },
  { value: 'low', label: 'مالي خلق', icon: BatteryLow },
];
const ENERGY_LINE: Record<EnergyLevel, string> = {
  high: 'حلو! خلنا نستغلها بشي يناسبك.',
  mid: 'تمام، نمشيها على قدك.',
  low: 'يا بعدي، قلت لي مالك خلق، فنمشيها خفيف.',
};
let greeted = false;

export function Home({ onNavigate }: { onNavigate(v: ViewId): void }) {
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
  const energyToday = latest && latest.d === today() ? latest.e : null;
  const dateLine = new Date().toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' });
  const st = progressStats(s);
  const xp = useCountUp(s.xp);
  const items = open ? s.mission!.items : doneToday && s.mission && !s.mission.solo ? s.mission.items : planned;
  const mins = items.reduce((n, g) => n + CHALLENGES[g.id].min, 0);
  const doneCount = open ? s.mission!.items.filter((i) => i.status === 'COMPLETED').length : 0;
  const praying = inPrayerWindow(s);
  const recent = [...st.attempts].reverse().slice(0, 2);
  const blocked = !!s.driving || praying;

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
    mascot.play(e === 'high' ? 'happy' : 'encouraging');
  }

  const breakAction = () => missions.start([{ id: 'calm_landscape', why: 'اخترت تاخذ بريك', diff: 'normal' }]);
  const QUICK: { label: string; icon: LucideIcon; act(): void; tone: 'em' | 'lil' | 'sky' | 'sun' }[] = [
    { label: 'ابدأ تحدي', icon: Gamepad2, act: () => onNavigate('chal'), tone: 'em' },
    { label: 'سولف مع خويّك', icon: MessageCircle, act: () => onNavigate('chat'), tone: 'lil' },
    { label: 'خذ لك بريك', icon: Coffee, act: breakAction, tone: 'sky' },
    { label: 'شوف تطورك', icon: BarChart3, act: () => onNavigate('prog'), tone: 'sun' },
  ];

  return (
    <div className="dash">
      <section className="welcome" aria-label="الترحيب">
        <Mascot state={mascot.state} size={112} label="خويّك" interactive />
        <div className="grow">
          <p className="eyebrow">{dateLine}</p>
          <h1>هلا والله {s.name}، {greeting}</h1>
          <p className="welcome__line">{energyToday ? ENERGY_LINE[energyToday] : 'كيف طاقتك اليوم؟ وأرتب المهمة على قدك.'}</p>
          <Segmented className="seg--energy" label="طاقتك اليوم" value={energyToday} options={ENERGY} onChange={checkIn} />
          <button type="button" className="btn-link" onClick={() => onNavigate('chat')}><MessageCircle size={16} aria-hidden="true" /> احكي لي عن يومك</button>
        </div>
      </section>

      <section className="mission" aria-labelledby="mission-t">
        {s.driving ? (
          <div className="mission__stop">
            <Mascot state="concerned" size={84} />
            <div>
              <h2 id="mission-t">وقفنا التحديات</h2>
              <p>حددت في ملفك إنك تسوق الحين. نرجع لك بعد ما توصل بالسلامة، وعيونك على الطريق.</p>
              <button type="button" className="btn sm alt" onClick={() => onNavigate('set')}>وصلت؟ غيّرها من ملفي</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mission__head">
              <div className="grow">
                <p className="eyebrow">{open ? 'مهمة مفتوحة' : doneToday ? 'مهمة اليوم' : 'مهمتك اليوم'}</p>
                <h2 id="mission-t">
                  {praying ? 'وقت صلاة' : open ? `كمّلنا ${doneCount} من ${items.length}` : doneToday ? (s.lastDaily!.all ? 'خلصت مهمة اليوم' : 'انتهت مهمة اليوم') : `${items.length} خطوات، تبدأها مرة وحدة`}
                </h2>
                <p className="note flush">{praying ? 'حسب إعداداتك نأجل التحديات الحين. تقبل الله طاعتك.' : open ? `آخر مرة وقفنا عند «${CHALLENGES[currentItem(s)!.id].t}». نعيد هذا التحدي من أوله، ومحاولاتك السابقة محفوظة.` : missionReason(s)}</p>
              </div>
              <span className="pill"><Clock size={14} aria-hidden="true" /> تقريبًا {mins} د</span>
            </div>
            <MissionTimeline items={items} current={open ? s.mission!.idx : undefined} />
            <div className="mission__act">
              <button type="button" className="btn btn--lg" disabled={blocked} onClick={() => missions.start()}>
                <Play size={17} aria-hidden="true" /> {open ? 'كمّل المهمة' : doneToday ? 'ابدأ مهمة ثانية' : 'ابدأ المهمة'}
              </button>
              {open && (
                <>
                  <button type="button" className="btn sm alt" disabled={blocked} onClick={() => missions.resume('restart')}>ابدأ التحدي من أول</button>
                  <button type="button" className="btn sm alt" disabled={blocked} onClick={() => missions.resume('easier')}>نسخة أسهل</button>
                  <button type="button" className="btn sm alt" disabled={blocked} onClick={() => missions.resume('skip')}>تخطّى</button>
                </>
              )}
            </div>
          </>
        )}
      </section>

      <section className="panel prog-mini" aria-labelledby="prog-t">
        <div className="prog-mini__top">
          <div>
            <h2 id="prog-t">تقدمي</h2>
            <p className="note flush">النقاط تشجيع على المشاركة، مو مقياس لصحتك.</p>
          </div>
          <span className="lvl" aria-label={`المستوى ${level(s)}`}>{level(s)}</span>
        </div>
        <ProgressBar value={s.xp % 100} label="التقدم للمستوى التالي" />
        <p className="note">{xp} نقطة · باقي {100 - (s.xp % 100)} للمستوى {level(s) + 1}</p>
        <dl className="mini-stats">
          <div><dt>مكتملة</dt><dd>{st.completed.length}</dd></div>
          <div><dt>اليوم</dt><dd>{st.days[6].count}</dd></div>
        </dl>
        {recent.length > 0 ? (
          <ul className="recent">
            {recent.map((a) => (
              <li key={a.ts}>
                <span>{CHALLENGES[a.id].t}</span>
                <span className="note">{a.status === 'COMPLETED' ? (a.acc != null ? `دقة ${a.acc}%` : 'مكتمل') : a.status === 'SKIPPED' ? 'متخطى' : 'موقوف'}</span>
              </li>
            ))}
          </ul>
        ) : <p className="note">أول ما تخلص تحدي، يطلع هنا.</p>}
        {st.attempts.length >= 4 && <p className="insight">لاحظت من محاولاتك: {st.shortCount} من {st.completed.length} تحديات مكتملة أخذت دقيقة أو أقل.</p>}
      </section>

      <section className="quick" aria-label="اختصارات">
        {QUICK.map((q) => (
          <button key={q.label} type="button" className="qa" disabled={q.label === 'خذ لك بريك' && blocked} onClick={q.act}>
            <IconBadge icon={q.icon} tone={q.tone} size={20} />
            <span>{q.label}</span>
          </button>
        ))}
      </section>

      <section className="panel dayctx" aria-labelledby="day-t">
        <SectionTitle title="ترتيب يومك" sub="بس اللي قلته لي. ما فيه تقويم ولا مواقيت مربوطة." icon={MapPin} />
        <div className="dayctx__row">
          <label htmlFor="prayer-time">الصلاة القادمة <span className="note">(تدخلها أنت)</span></label>
          <div className="row">
            <input id="prayer-time" type="time" value={prayer} onChange={(e) => setPrayer(e.target.value)} />
            <button type="button" className="btn sm alt" onClick={() => store.update((d) => { d.prayer = prayer; d.prayerDay = today(); })}>حفظ</button>
          </div>
          {s.prayer && <p className="note flush">{`${s.prayer}، وأحمي ${s.pp} دقيقة بعدها، لليوم بس.`}</p>}
        </div>
        <div className="dayctx__row">
          <span>اللي وافقت أسجله</span>
          {s.ctx.length ? <div className="tags">{s.ctx.map((c) => <span key={c} className="tag">{CONTEXT_LABELS[c]}</span>)}</div> : <p className="note flush">ما سجلت شي. احكي لي عن يومك في المحادثة، وأسألك قبل ما أسجل.</p>}
        </div>
        <div className="dayctx__row">
          <span>جدولك</span>
          <p className="note flush">{SCHED[s.sched] || 'ما حددته'}</p>
        </div>
        <button type="button" className="btn-link" onClick={() => onNavigate('set')}><Settings2 size={16} aria-hidden="true" /> عدّلها من ملفي</button>
      </section>
    </div>
  );
}
