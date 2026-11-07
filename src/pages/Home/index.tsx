import { BarChart3, BatteryFull, BatteryLow, BatteryMedium, Clock, Coffee, Gamepad2, MapPin, MessageCircle, Play, Settings2, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconBadge, ProgressBar, SectionTitle, Segmented } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { CHALLENGES } from '../../features/challenges/catalog';
import { currentItem, hasOpenMission } from '../../features/mission/engine';
import { MissionTimeline } from '../../features/mission/MissionTimeline';
import { useMissions } from '../../features/mission/MissionProvider';
import { generateMission, inPrayerWindow, isLowEnergy, missionReason } from '../../features/mission/planner';
import { NextPrayerLine } from '../../features/prayer/PrayerCity';
import { progressStats } from '../../features/progress/stats';
import { useCountUp } from '../../hooks/useCountUp';
import { formatDate, iso } from '../../i18n';
import type { EnergyLevel, ViewId } from '../../types';
import { level, today } from '../../utils';

const ENERGY: { value: EnergyLevel; icon: LucideIcon }[] = [
  { value: 'high', icon: BatteryFull },
  { value: 'mid', icon: BatteryMedium },
  { value: 'low', icon: BatteryLow },
];
let greeted = false;

export function Home({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const missions = useMissions();
  const low = isLowEnergy(s);
  const mascot = useMascot(low ? 'resting' : 'idle');
  const [prayer, setPrayer] = useState(s.prayer);
  const h = new Date().getHours();
  const greeting = t(h < 12 ? 'dashboard.morning' : h < 17 ? 'dashboard.afternoon' : 'dashboard.evening');
  const open = hasOpenMission(s);
  const planned = generateMission(s);
  const doneToday = !!s.lastDaily && s.lastDaily.d === today();
  const latest = s.en[s.en.length - 1];
  const energyToday = latest && latest.d === today() ? latest.e : null;
  const dateLine = formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
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
    const id = setTimeout(() => { greeted = true; });
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mascot.play]);

  function checkIn(e: EnergyLevel) {
    store.update((d) => {
      d.en = d.en.filter((y) => y.d !== today());
      d.en.push({ d: today(), e, ts: Date.now() });
    });
    mascot.play(e === 'high' ? 'happy' : 'encouraging');
  }

  const breakAction = () => missions.start([{ id: 'calm_landscape', why: [{ k: 'break' }], diff: 'normal' }]);
  const QUICK: { key: string; icon: LucideIcon; act(): void; tone: 'em' | 'lil' | 'sky' | 'sun'; block?: boolean }[] = [
    { key: 'challenge', icon: Gamepad2, act: () => onNavigate('chal'), tone: 'em' },
    { key: 'chat', icon: MessageCircle, act: () => onNavigate('chat'), tone: 'lil' },
    { key: 'break', icon: Coffee, act: breakAction, tone: 'sky', block: true },
    { key: 'progress', icon: BarChart3, act: () => onNavigate('prog'), tone: 'sun' },
  ];

  const missionTitle = praying
    ? t('dashboard.prayerTime')
    : open
      ? t('dashboard.missionProgress', { n: doneCount, total: items.length })
      : doneToday
        ? t(s.lastDaily!.all ? 'dashboard.missionDone' : 'dashboard.missionEnded')
        : t('dashboard.missionSteps', { count: items.length });

  return (
    <div className="dash">
      <section className="welcome" aria-label={t('dashboard.welcomeLabel')}>
        <Mascot state={mascot.state} size={112} label={t('common.brand')} interactive />
        <div className="grow">
          <p className="eyebrow">{dateLine}</p>
          <h1>{t('dashboard.hello', { name: iso(s.name), greeting })}</h1>
          <p className="welcome__line">{energyToday ? t(`dashboard.energyLine.${energyToday}`) : t('dashboard.energyAsk')}</p>
          <Segmented<EnergyLevel> className="seg--energy" label={t('dashboard.energyLabel')} value={energyToday} options={ENERGY.map((e) => ({ ...e, label: t(`dashboard.energy.${e.value}`) }))} onChange={checkIn} />
          <button type="button" className="btn-link" onClick={() => onNavigate('chat')}><MessageCircle size={16} aria-hidden="true" /> {t('dashboard.tellMe')}</button>
        </div>
      </section>

      <section className="mission" aria-labelledby="mission-t">
        {s.driving ? (
          <div className="mission__stop">
            <Mascot state="concerned" size={84} />
            <div>
              <h2 id="mission-t">{t('dashboard.drivingTitle')}</h2>
              <p>{t('dashboard.drivingText')}</p>
              <button type="button" className="btn sm alt" onClick={() => onNavigate('set')}>{t('dashboard.drivingAction')}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mission__head">
              <div className="grow">
                <p className="eyebrow">{t(open ? 'dashboard.missionOpen' : doneToday ? 'dashboard.missionToday' : 'dashboard.todayMission')}</p>
                <h2 id="mission-t">{missionTitle}</h2>
                <p className="note flush">{praying ? t('dashboard.prayerText') : open ? t('dashboard.resumeText', { name: t(`challenges.items.${currentItem(s)!.id}.name`) }) : missionReason(s)}</p>
              </div>
              <span className="pill"><Clock size={14} aria-hidden="true" /> {t('dashboard.approx', { n: mins })}</span>
            </div>
            <MissionTimeline items={items} current={open ? s.mission!.idx : undefined} />
            <div className="mission__act">
              <button type="button" className="btn btn--lg" disabled={blocked} onClick={() => missions.start()}>
                <Play size={17} aria-hidden="true" /> {t(open ? 'dashboard.continueMission' : doneToday ? 'dashboard.anotherMission' : 'dashboard.startMission')}
              </button>
              {open && (
                <>
                  <button type="button" className="btn sm alt" disabled={blocked} onClick={() => missions.resume('restart')}>{t('dashboard.restartChallenge')}</button>
                  <button type="button" className="btn sm alt" disabled={blocked} onClick={() => missions.resume('easier')}>{t('dashboard.easierVersion')}</button>
                  <button type="button" className="btn sm alt" disabled={blocked} onClick={() => missions.resume('skip')}>{t('dashboard.skipIt')}</button>
                </>
              )}
            </div>
          </>
        )}
      </section>

      <section className="panel prog-mini" aria-labelledby="prog-t">
        <div className="prog-mini__top">
          <div>
            <h2 id="prog-t">{t('dashboard.myProgress')}</h2>
            <p className="note flush">{t('common.xpDisclaimer')}</p>
          </div>
          <span className="lvl" aria-label={t('common.levelN', { n: level(s) })}>{level(s)}</span>
        </div>
        <ProgressBar value={s.xp % 100} label={t('common.toNextLevel')} />
        <p className="note">{t('dashboard.xpLine', { xp, left: 100 - (s.xp % 100), next: level(s) + 1 })}</p>
        <dl className="mini-stats">
          <div><dt>{t('dashboard.completed')}</dt><dd>{st.completed.length}</dd></div>
          <div><dt>{t('dashboard.today')}</dt><dd>{st.days[6].count}</dd></div>
        </dl>
        {recent.length > 0 ? (
          <ul className="recent">
            {recent.map((a) => (
              <li key={a.ts}>
                <span>{t(`challenges.items.${a.id}.name`)}</span>
                <span className="note">{a.status === 'COMPLETED' ? (a.acc != null ? t('dashboard.recentAcc', { acc: a.acc }) : t('player.status.completed')) : t(a.status === 'SKIPPED' ? 'player.status.skipped' : 'player.status.abandoned')}</span>
              </li>
            ))}
          </ul>
        ) : <p className="note">{t('dashboard.recentEmpty')}</p>}
        {st.attempts.length >= 4 && <p className="insight">{t('dashboard.insight', { short: st.shortCount, total: st.completed.length })}</p>}
      </section>

      <section className="quick" aria-label={t('dashboard.quickLabel')}>
        {QUICK.map((q) => (
          <button key={q.key} type="button" className="qa" disabled={q.block && blocked} onClick={q.act}>
            <IconBadge icon={q.icon} tone={q.tone} size={20} />
            <span>{t(`dashboard.quick.${q.key}`)}</span>
          </button>
        ))}
      </section>

      <section className="panel dayctx" aria-labelledby="day-t">
        <SectionTitle title={t('dashboard.dayTitle')} sub={t('dashboard.daySub')} icon={MapPin} />
        {s.city ? (
          <div className="dayctx__row">
            <span>{t('dashboard.nextPrayer')}</span>
            <NextPrayerLine city={s.city} />
            <p className="note flush">{t('dashboard.prayerCalc', { city: t(`common.cities.${s.city}`), mins: s.pp })}</p>
          </div>
        ) : (
          <div className="dayctx__row">
            <label htmlFor="prayer-time">{t('dashboard.nextPrayer')} <span className="note">{t('dashboard.youEnterIt')}</span></label>
            <div className="row">
              <input id="prayer-time" type="time" value={prayer} onChange={(e) => setPrayer(e.target.value)} />
              <button type="button" className="btn sm alt" onClick={() => store.update((d) => { d.prayer = prayer; d.prayerDay = today(); })}>{t('common.save')}</button>
            </div>
            {s.prayer && <p className="note flush">{t('dashboard.prayerSaved', { time: s.prayer, mins: s.pp })}</p>}
            <p className="note flush">{t('dashboard.prayerCityHint')}</p>
          </div>
        )}
        <div className="dayctx__row">
          <span>{t('dashboard.approved')}</span>
          {s.ctx.length ? <div className="tags">{s.ctx.map((c) => <span key={c} className="tag">{t(`common.context.${c}`)}</span>)}</div> : <p className="note flush">{t('dashboard.approvedEmpty')}</p>}
        </div>
        <div className="dayctx__row">
          <span>{t('dashboard.schedule')}</span>
          <p className="note flush">{s.sched ? t(`common.sched.${s.sched}`) : t('dashboard.scheduleNone')}</p>
        </div>
        <button type="button" className="btn-link" onClick={() => onNavigate('set')}><Settings2 size={16} aria-hidden="true" /> {t('dashboard.editInProfile')}</button>
      </section>
    </div>
  );
}
