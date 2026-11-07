import { BatteryFull, BatteryLow, BatteryMedium, ChevronDown, Clock, MessageCircle, Play, Shuffle, Timer, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProgressBar, Segmented } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { CHALLENGES } from '../../features/challenges/catalog';
import { ChallengeArt } from '../../features/challenges/ChallengeArt';
import { buddyMood, ENERGY_FULL, energyToday as buddyEnergy } from '../../features/buddy/buddy';
import { GoalsCard, MissedYou } from '../../features/buddy/BuddyCards';
import { currentItem, hasOpenMission } from '../../features/mission/engine';
import { MissionTimeline } from '../../features/mission/MissionTimeline';
import { useMissions } from '../../features/mission/MissionProvider';
import { generateMission, isLowEnergy, missionReason, whyText } from '../../features/mission/planner';
import { acknowledge, breakLeft, needsCheckIn, nextOf, placeOf } from '../../features/prayer/gate';
import { PrayerCheckIn } from '../../features/prayer/PrayerBreak';
import { useMinute } from '../../features/prayer/PrayerCity';
import { formatPrayerTime } from '../../features/prayer/times';
import { progressStats } from '../../features/progress/stats';
import { recommend } from '../../features/recommend/engine';
import { currentLang, formatDate, iso } from '../../i18n';
import type { ChallengeId, EnergyLevel, PlannedItem, ViewId } from '../../types';
import { level, today } from '../../utils';

const ENERGY: { value: EnergyLevel; icon: LucideIcon }[] = [
  { value: 'high', icon: BatteryFull },
  { value: 'mid', icon: BatteryMedium },
  { value: 'low', icon: BatteryLow },
];
let greeted = false;

// One calm screen: a greeting, one next step, today's goals with the buddy's energy, a way to talk, and a small progress line.
// Everything else lives in its own tab, so the dashboard helps decide instead of adding decisions.
export function Home({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const missions = useMissions();
  const low = isLowEnergy(s);
  // The buddy wakes up as today's energy comes in, and reacts to each new point.
  const mascot = useMascot(buddyMood(s, low));
  const nrg = buddyEnergy(s);
  const lastNrg = useRef(nrg);
  const [steps, setSteps] = useState(false);
  const [options, setOptions] = useState(false);
  const h = new Date().getHours();
  const greeting = t(h < 12 ? 'dashboard.morning' : h < 17 ? 'dashboard.afternoon' : 'dashboard.evening');
  const open = hasOpenMission(s);
  const doneToday = !!s.lastDaily && s.lastDaily.d === today();
  const latest = s.en[s.en.length - 1];
  const energyToday = latest && latest.d === today() ? latest.e : null;
  // Prayer time never blocks the dashboard. It shows a small check-in, once per window, if the user wants that.
  // Ticks every minute, so the next prayer and any check-in update without a reload.
  const now = useMinute();
  const askWindow = needsCheckIn(s, now);
  const blocked = !!s.driving;
  const st = progressStats(s);

  useEffect(() => {
    if (greeted || s.driving) return;
    mascot.play('greeting');
    const id = setTimeout(() => { greeted = true; });
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mascot.play]);

  useEffect(() => {
    if (nrg > lastNrg.current) mascot.play(nrg >= ENERGY_FULL ? 'celebrating' : 'happy');
    lastNrg.current = nrg;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nrg]);

  function checkIn(e: EnergyLevel) {
    store.update((d) => {
      d.en = d.en.filter((y) => y.d !== today());
      d.en.push({ d: today(), e, ts: Date.now() });
    });
    mascot.play(e === 'high' ? 'happy' : 'encouraging');
  }

  return (
    <div className="dash dash--calm">
      <section className="hello" aria-label={t('dashboard.welcomeLabel')}>
        <Mascot state={mascot.state} size={84} label={t('common.brand')} interactive />
        <div className="grow">
          <p className="eyebrow">{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{t('dashboard.hello', { name: iso(s.name), greeting })}</h1>
          <p className="hello__line">{energyToday ? t(`dashboard.energyLine.${energyToday}`) : t('dashboard.howToday')}</p>
          <Segmented<EnergyLevel> className="seg--energy seg--compact" label={t('dashboard.energyLabel')} value={energyToday} options={ENERGY.map((e) => ({ ...e, label: t(`dashboard.energy.${e.value}`) }))} onChange={checkIn} />
        </div>
      </section>

      <MissedYou />

      {s.prayerBreak && !s.driving && <BreakRow onOpen={() => missions.openBreak(null)} />}
      {askWindow && !s.prayerBreak && !s.driving && (
        <PrayerCheckIn
          compact
          window={askWindow}
          onPrayed={() => store.update((d) => acknowledge(d, askWindow, 'prayed'))}
          onNotYet={() => missions.openBreak(askWindow)}
          onNotNow={() => store.update((d) => acknowledge(d, askWindow, 'later'))}
        />
      )}

      {s.driving ? (
        <section className="next next--stop" aria-labelledby="next-t">
          <Mascot state="concerned" size={72} />
          <div>
            <h2 id="next-t">{t('dashboard.drivingTitle')}</h2>
            <p>{t('dashboard.drivingText')}</p>
            <button type="button" className="btn sm alt" onClick={() => onNavigate('set')}>{t('dashboard.drivingAction')}</button>
          </div>
        </section>
      ) : open ? (
        OpenMission({ onOptions: () => setOptions(!options), options, blocked })
      ) : doneToday ? (
        SingleStep({ onNavigate })
      ) : (
        DailyMission({ steps, onSteps: () => setSteps(!steps), onNavigate })
      )}

      {!s.driving && <GoalsCard />}

      <button type="button" className="talk" onClick={() => onNavigate('chat')}>
        <span className="talk__icon"><MessageCircle size={20} aria-hidden="true" /></span>
        <span className="grow">
          <b>{t('dashboard.talkTitle')}</b>
          <span className="note">{t('dashboard.talkSub')}</span>
        </span>
      </button>

      <button type="button" className="mini" onClick={() => onNavigate('prog')} aria-label={t('dashboard.progressLabel', { n: level(s), done: st.days[6].count })}>
        <span className="lvl" aria-hidden="true">{level(s)}</span>
        <span className="grow">
          <span className="mini__top"><b>{t('common.levelN', { n: level(s) })}</b><span className="note">{t('dashboard.doneToday', { count: st.days[6].count })}</span></span>
          <ProgressBar value={s.xp % 100} label={t('common.toNextLevel')} />
        </span>
      </button>

      {DayContext({ onNavigate })}
    </div>
  );

  // Plain render helpers, called as functions, so nothing remounts on each render.
  function BreakRow({ onOpen }: { onOpen(): void }) {
    const b = s.prayerBreak!;
    // The current time, not the minute tick, which can be up to a minute old.
    const left = breakLeft(b, Date.now());
    return (
      <button type="button" className="mini pbk-row" onClick={onOpen}>
        <span className="talk__icon"><Timer size={20} aria-hidden="true" /></span>
        <span className="grow">
          <b>{left ? t('prayer.break.rowLeft', { n: Math.ceil(left / 60000) }) : t('prayer.break.rowUp')}</b>
          <span className="note">{t(hasOpenMission(s) ? 'prayer.break.saved' : 'prayer.break.reminderOnly')}</span>
        </span>
      </button>
    );
  }

  function OpenMission({ options, onOptions, blocked }: { options: boolean; onOptions(): void; blocked: boolean }) {
    const M = s.mission!;
    const it = currentItem(s)!;
    const done = M.items.filter((i) => i.status === 'COMPLETED').length;
    return (
      <section className="next" aria-labelledby="next-t">
        <p className="eyebrow">{t('dashboard.nextStep')}</p>
        <div className="next__row">
          <div className="next__art"><ChallengeArt id={it.id} /></div>
          <div className="grow">
            <h2 id="next-t">{t('dashboard.pickUp')}</h2>
            <p className="next__name">{t(`challenges.items.${it.id}.name`)}</p>
            {M.items.length > 1 && <p className="note flush">{t('dashboard.missionProgress', { n: done, total: M.items.length })}</p>}
          </div>
        </div>
        <p className="note">{t('dashboard.resumeShort')}</p>
        <div className="next__act">
          <button type="button" className="btn btn--lg" disabled={blocked} onClick={() => missions.start()}><Play size={17} aria-hidden="true" /> {t('dashboard.continueMission')}</button>
          <button type="button" className="btn-link" aria-expanded={options} onClick={onOptions}>{t('dashboard.otherOptions')} <ChevronDown size={15} aria-hidden="true" /></button>
        </div>
        {options && (
          <div className="row">
            <button type="button" className="btn sm alt" disabled={blocked} onClick={() => missions.resume('restart')}>{t('dashboard.restartChallenge')}</button>
            <button type="button" className="btn sm alt" disabled={blocked} onClick={() => missions.resume('easier')}>{t('dashboard.easierVersion')}</button>
            <button type="button" className="btn sm alt" disabled={blocked} onClick={() => missions.resume('skip')}>{t('dashboard.skipIt')}</button>
          </div>
        )}
      </section>
    );
  }

  function DailyMission({ steps, onSteps, onNavigate }: { steps: boolean; onSteps(): void; onNavigate(v: ViewId): void }) {
    const items = generateMission(s);
    const first = items[0];
    const mins = items.reduce((n, g) => n + CHALLENGES[g.id].min, 0);
    return (
      <section className="next" aria-labelledby="next-t">
        <p className="eyebrow">{t('dashboard.nextStep')}</p>
        <div className="next__row">
          <div className="next__art"><ChallengeArt id={first.id} /></div>
          <div className="grow">
            <h2 id="next-t">{t('dashboard.missionReady')}</h2>
            <p className="next__meta"><Clock size={14} aria-hidden="true" /> {t('dashboard.stepsAbout', { count: items.length, n: mins })}</p>
          </div>
        </div>
        <p className="note">{missionReason(s)}</p>
        <div className="next__act">
          <button type="button" className="btn btn--lg" onClick={() => missions.start()}><Play size={17} aria-hidden="true" /> {t('dashboard.startMission')}</button>
          <button type="button" className="btn-link" aria-expanded={steps} onClick={onSteps}>{t('dashboard.seeSteps')} <ChevronDown size={15} aria-hidden="true" /></button>
          <button type="button" className="btn-link" onClick={() => onNavigate('chal')}><Shuffle size={15} aria-hidden="true" /> {t('dashboard.chooseAnother')}</button>
        </div>
        {steps && <MissionTimeline items={items} />}
      </section>
    );
  }

  // After today's mission: one suggestion from the recommendation engine, never a second full plan.
  function SingleStep({ onNavigate }: { onNavigate(v: ViewId): void }) {
    const pick = recommend(s, { low, goals: low ? ['rest'] : undefined })[0] ?? recommend(s, { low })[0];
    if (!pick) return null;
    const id: ChallengeId = pick.id;
    const item: PlannedItem = { id, why: pick.why.length ? pick.why : [{ k: 'starter' }], diff: pick.diff };
    return (
      <section className="next" aria-labelledby="next-t">
        <p className="eyebrow">{t(s.lastDaily!.all ? 'dashboard.missionDone' : 'dashboard.missionEnded')}</p>
        <div className="next__row">
          <div className="next__art"><ChallengeArt id={id} /></div>
          <div className="grow">
            <h2 id="next-t">{t('dashboard.oneMore')}</h2>
            <p className="next__name">{t(`challenges.items.${id}.name`)}</p>
            <p className="next__meta"><Clock size={14} aria-hidden="true" /> {t('common.minutes', { count: CHALLENGES[id].min })}</p>
          </div>
        </div>
        <p className="note">{pick.why.length ? whyText(pick.why) : t(`challenges.items.${id}.purpose`)}</p>
        <div className="next__act">
          <button type="button" className="btn btn--lg" onClick={() => missions.start([item])}><Play size={17} aria-hidden="true" /> {t('common.start')}</button>
          <button type="button" className="btn-link" onClick={() => onNavigate('chal')}><Shuffle size={15} aria-hidden="true" /> {t('dashboard.chooseAnother')}</button>
        </div>
        <p className="note flush">{t('dashboard.restIsFine')}</p>
      </section>
    );
  }

  // Only details that exist. No empty cards to fill space, and no prayer time unless one was calculated.
  function DayContext({ onNavigate }: { onNavigate(v: ViewId): void }) {
    const rows = [];
    const next = nextOf(s, now);
    const place = placeOf(s);
    if (next && place) {
      const mins = Math.max(0, Math.round((next.at.getTime() - now.getTime()) / 60000));
      rows.push(
        <li key="p" className="today__prayer">
          <span>{t('dashboard.nextPrayer')}</span>
          <span><b>{t(`common.prayer.names.${next.id}`)} · {formatPrayerTime(next.at, currentLang(), place.tz)}</b> <span className="note">{mins < 60 ? t('prayer.inMin', { count: mins }) : t('prayer.inHours', { h: Math.floor(mins / 60), m: mins % 60 })}</span></span>
        </li>,
      );
    } else if (s.prayerOn && s.prayer && s.prayerDay === today()) rows.push(<li key="p"><span>{t('dashboard.nextPrayer')}</span><b>{s.prayer}</b></li>);
    if (s.ctx.length) rows.push(<li key="c"><span>{t('dashboard.approved')}</span><span className="tags">{s.ctx.map((c) => <span key={c} className="tag">{t(`common.context.${c}`)}</span>)}</span></li>);
    if (!rows.length) return null;
    return (
      <section className="today" aria-label={t('dashboard.dayTitle')}>
        <ul>{rows}</ul>
        <button type="button" className="btn-link" onClick={() => onNavigate('set')}>{t('dashboard.editInProfile')}</button>
      </section>
    );
  }
}
