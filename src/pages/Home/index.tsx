import { named } from '../../features/companion/name';
import { BatteryFull, BatteryLow, BatteryMedium, Check, ChevronDown, Clock, Compass, Flag, MessageCircle, Play, Shuffle, Sparkles, Timer, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProgressBar, Segmented } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import ClickSpark, { type ClickSparkHandle } from '../../components/reactbits/ClickSpark';
import { Reveal, SettleText } from '../../components/ui/HomeMotion';
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
import { currentNode, nodeState, pathItem, type PathNode } from '../../features/path/planner';
import { StreakChip } from '../../features/streak/StreakBits';
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
  // Sad only for today's own low-energy answer, not for a "short missions" preference.
  const lastCheckIn = s.en[s.en.length - 1];
  const mascot = useMascot(buddyMood(s, !!lastCheckIn && lastCheckIn.d === today() && lastCheckIn.e === 'low'));
  const nrg = buddyEnergy(s);
  const lastNrg = useRef(nrg);
  const energySpark = useRef<ClickSparkHandle>(null);
  const [steps, setSteps] = useState(false);
  const [options, setOptions] = useState(false);
  // The buddy asks about energy once a day. After an answer it becomes a small badge that reopens the question.
  const [askEnergy, setAskEnergy] = useState(false);
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
  const node = currentNode(s.path);

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
    // Low energy gets no cheerful reaction: the buddy's sad look comes from its mood instead.
    if (e !== 'low') mascot.play(e === 'high' ? 'happy' : 'encouraging');
    else mascot.clear();
    // A small burst for high energy only, from that choice. Measured now, before the bubble closes.
    if (e === 'high') {
      const root = document.querySelector('.hero__scene')?.getBoundingClientRect();
      const btn = document.querySelectorAll('.ebubble .seg__b')[ENERGY.findIndex((x) => x.value === 'high')]?.getBoundingClientRect();
      if (root && btn) energySpark.current?.spark(btn.left - root.left + btn.width / 2, btn.top - root.top + btn.height / 2);
    }
    setAskEnergy(false);
  }

  const dayContext = DayContext({ onNavigate });

  const sky = h < 12 ? 'morning' : h < 17 ? 'day' : 'evening';

  return (
    <div className="dash dash--world">
      {/* Home is one small world, top to bottom: the sky and the buddy's hill, the meadow with today's step,
          then a trail of stepping stones for the goals. Below it, a quieter garden with everything else. */}
      <div className="world">
        <section className={`hero hero--${sky} hero--e${nrg}`} aria-label={t('dashboard.welcomeLabel')}>
          <span className="sky" aria-hidden="true"><i className="sky__orb" /><i className="sky__cloud" /><i className="sky__cloud sky__cloud--2" /><i className="sky__dots" /></span>
          {/* Total points and the streak, small, at the top. Points open Rewards; the streak opens Progress, where its days are shown. */}
          <div className="hero__top">
            <p className="eyebrow">{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <span className="hero__chips">
              <button type="button" className="sk-chip hero__pts" aria-label={t('path.xpLabel', { n: s.xp })} onClick={() => onNavigate('rew')}><Sparkles size={14} aria-hidden="true" /> <b>{s.xp}</b></button>
              {s.streakOn ? <button type="button" className="hero__streak" onClick={() => onNavigate('prog')}><StreakChip /></button> : null}
            </span>
          </div>
          <div className="hero__txt">
            <h1><SettleText text={t('dashboard.hello', { name: iso(s.name), greeting })} /></h1>
            {/* While the buddy's bubble asks about energy, the line would repeat it, so it waits for the answer. */}
            {energyToday && !askEnergy && <p className="hero__line">{t(`dashboard.energyLine.${energyToday}`, named(s.name))}</p>}
          </div>
          <ClickSpark ref={energySpark} auto={false} className="hero__scene" disabled={!!s.rm} sparkColor={['#28785B', '#FFD36E', '#A78BFA']} sparkSize={9} sparkRadius={26} sparkCount={10} duration={500}>
            <div className="hw-stage">
              <span className="hw-glow" aria-hidden="true" />
              <div className="hero__buddy">
                <Mascot state={mascot.state} size={190} label={t('common.brand')} interactive />
              </div>
              {energyToday && !askEnergy && (() => {
                const Icon = ENERGY.find((x) => x.value === energyToday)!.icon;
                const name = t(`dashboard.energy.${energyToday}`);
                return (
                  <button type="button" className={`ebadge ebadge--${energyToday}`} aria-label={t('dashboard.energyChange', { level: name })} onClick={() => setAskEnergy(true)}>
                    <Icon size={15} aria-hidden="true" /> {name}
                  </button>
                );
              })()}
              <svg className="hill" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
                <path className="hill__back" d="M0 70 C 70 30, 140 40, 210 62 S 340 20, 400 44 L 400 120 L 0 120 Z" />
                <path className="hill__front" d="M0 92 C 90 54, 150 46, 200 46 S 320 60, 400 88 L 400 120 L 0 120 Z" />
              </svg>
            </div>
            {(!energyToday || askEnergy) && (
              <div className="hero__ask">
                {/* The question comes from the buddy, as a speech bubble pointing up at it. */}
                <div className="ebubble">
                  <p className="ebubble__q">{t('dashboard.energyBubble')}</p>
                  <Segmented<EnergyLevel> className="seg--bubble" label={t('dashboard.energyLabel')} value={energyToday} options={ENERGY.map((e) => ({ ...e, label: t(`dashboard.energy.${e.value}`) }))} onChange={checkIn} />
                </div>
              </div>
            )}
          </ClickSpark>
        </section>

        <div className="meadow">
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
      ) : node ? (
        PathNext({ n: node })
      ) : doneToday ? (
        SingleStep({ onNavigate })
      ) : (
        DailyMission({ steps, onSteps: () => setSteps(!steps), onNavigate })
      )}
        </div>

        {!s.driving && (
          <div className="trail">
            <svg className="wave" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0 L400 0 L400 14 C 300 40, 220 2, 140 22 S 40 30, 0 16 Z" /></svg>
            <Reveal><GoalsCard /></Reveal>
          </div>
        )}
      </div>

      <div className="garden">

      <Reveal delay={0.05}>
      <div className="tiles">
        <button type="button" className="talk tile" onClick={() => onNavigate('chat')}>
          <span className="talk__icon"><MessageCircle size={20} aria-hidden="true" /></span>
          <span className="grow">
            <b>{t('dashboard.talkTitle')}</b>
            <span className="note">{t('dashboard.talkSub')}</span>
          </span>
        </button>
        {!s.path && (
          <button type="button" className="talk tile tile--path" onClick={() => onNavigate('path')}>
            <span className="talk__icon"><Compass size={20} aria-hidden="true" /></span>
            <span className="grow">
              <b>{t('path.homeSetup')}</b>
              <span className="note">{t('path.homeSetupSub')}</span>
            </span>
          </button>
        )}
      </div>
      </Reveal>

      <Reveal delay={0.05}>
      {s.path ? PathStrip() : (
        <button type="button" className="mini" onClick={() => onNavigate('prog')} aria-label={t('dashboard.progressLabel', { n: level(s), done: st.days[6].count })}>
          <span className="lvl" aria-hidden="true">{level(s)}</span>
          <span className="grow">
            <span className="mini__top"><b>{t('common.levelN', { n: level(s) })}</b><span className="note">{t('dashboard.doneToday', { count: st.days[6].count })}</span></span>
            <ProgressBar value={s.xp % 100} label={t('common.toNextLevel')} />
          </span>
        </button>
      )}
      </Reveal>

      {dayContext && <Reveal delay={0.05}>{dayContext}</Reveal>}
      </div>
    </div>
  );

  // The next step on the personal journey is the one main action on this screen.
  function PathNext({ n }: { n: PathNode }) {
    const name = n.kind === 'play' && n.id ? (n.id === 'seq' && n.cfg ? t('games.plan.title') : t(`challenges.items.${n.id}.name`)) : t(`path.node.${n.kind}`);
    const act = () => (n.kind === 'play' ? missions.start([pathItem(store.getState(), n)]) : onNavigate(n.kind === 'talk' ? 'chat' : 'path'));
    return (
      <section className="next" aria-labelledby="next-t">
        <p className="eyebrow">{t('dashboard.nextStep')}</p>
        <div className="next__row">
          {n.id && <div className="next__art"><ChallengeArt id={n.id} /></div>}
          <div className="grow">
            <h2 id="next-t" dir="auto">{name}</h2>
            {n.id && <p className="next__meta"><Clock size={14} aria-hidden="true" /> {t('common.minutes', { count: CHALLENGES[n.id].min })} · {t('path.canEarn', { n: CHALLENGES[n.id].xp })}</p>}
          </div>
        </div>
        <p className="note">{n.id ? t(`challenges.items.${n.id}.purpose`) : t(`path.nodeText.${n.kind}`)}</p>
        <div className="next__act">
          <button type="button" className="btn btn--lg" disabled={blocked} onClick={act}><Play size={17} aria-hidden="true" /> {t(n.kind === 'talk' ? 'path.talkNow' : 'common.start')}</button>
          <button type="button" className="btn-link" onClick={() => onNavigate('chal')}><Shuffle size={15} aria-hidden="true" /> {t('path.change')}</button>
        </div>
      </section>
    );
  }

  // Finished, current and upcoming steps at a glance. Only recorded progress is shown.
  function PathStrip() {
    const plan = s.path!;
    const chapter = node?.ch ?? plan.nodes[plan.nodes.length - 1].ch;
    const nodes = plan.nodes.filter((x) => x.ch === chapter);
    return (
      <section className="pstrip" aria-label={t('path.title')}>
        <div className="pstrip__top">
          <b>{t(`path.themes.${plan.themes[chapter] ?? 'gentle'}`)}</b>
        </div>
        <ol className="pstrip__dots" aria-label={t('path.stripLabel', { done: nodes.filter((x) => x.done).length, total: nodes.length })}>
          {nodes.map((x) => <li key={x.key} className={`is-${nodeState(plan, x)} ${x.kind === 'milestone' ? 'is-mile' : ''}`}>{x.done && <Check size={12} aria-hidden="true" />}{!x.done && x.kind === 'milestone' && <Flag size={12} aria-hidden="true" />}</li>)}
        </ol>
        <button type="button" className="btn-link" onClick={() => onNavigate('path')}>{t('path.see')}</button>
      </section>
    );
  }

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
