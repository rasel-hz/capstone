import { ArrowRight, Clock, LayoutGrid, Lightbulb, Play, Rocket, Sparkles, Target, Wind, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState } from '../../context/AppStateContext';
import { challengeStatus } from '../../features/challenges/ChallengeCard';
import { ChallengeArt } from '../../features/challenges/ChallengeArt';
import { CHALLENGES, GROUPS, type GroupId } from '../../features/challenges/catalog';
import { useMissions } from '../../features/mission/MissionProvider';
import type { AppState, ChallengeId, ViewId } from '../../types';

const ICON: Record<'all' | GroupId, LucideIcon> = { all: LayoutGrid, start: Rocket, focus: Target, calm: Wind, think: Lightbulb };
// Zaho's short reaction as the user picks a group.
const REACT = { all: 'greeting', start: 'encouraging', focus: 'curious', calm: 'happy', think: 'curious' } as const;

// A group to open on, set by a button elsewhere. Read once.
let opening: GroupId | null = null;
export function openChallenges(onNavigate: (v: ViewId) => void, group?: GroupId) {
  opening = group ?? null;
  onNavigate('chal');
}

/**
 * "Want something specific?": Zaho on top saying something for the chosen group, big group buttons, and the
 * challenges as illustrated tiles. "All" shows each group as a row you swipe through; one group shows a grid.
 */
export function Challenges({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const missions = useMissions();
  const [group, setGroup] = useState<'all' | GroupId>(() => {
    const g = opening ?? 'all';
    opening = null;
    return g;
  });
  const mascot = useMascot('idle');
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    mascot.play(REACT[group]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);
  useEffect(() => () => clearTimeout(leaving.current), []);

  // Zaho cheers, the tile pops, then the intro opens. With reduced motion it opens at once.
  function play(id: ChallengeId) {
    const quick = !!s.rm || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    mascot.play('celebrating');
    clearTimeout(leaving.current);
    leaving.current = setTimeout(() => missions.start([{ id, why: [{ k: 'self' }], diff: 'normal' }]), quick ? 0 : 260);
  }

  return (
    <div className="lib">
      <button type="button" className="btn-link back" onClick={() => onNavigate('path')}><ArrowRight size={17} className="flip" aria-hidden="true" /> {t('nav.myJourney')}</button>

      <header className="lib__hero">
        <div className="lib__buddy"><Mascot state={mascot.state} size={104} label={t('common.brand')} /></div>
        <div className="lib__bubble" aria-live="polite">
          <h1>{t('challenges.libraryTitle')}</h1>
          <motion.p key={group} initial={s.rm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>{t(`challenges.say.${group}`)}</motion.p>
        </div>
      </header>

      <div className="lib__groups" role="group" aria-label={t('challenges.groupLabel')}>
        {(['all', ...GROUPS.map((g) => g.id)] as const).map((c) => {
          const Ic = ICON[c];
          return (
            <button key={c} type="button" className={`lib__g ${group === c ? 'on' : ''}`} aria-pressed={group === c} onClick={() => setGroup(c)}>
              {group === c && <motion.span layoutId="lib-g" className="lib__g-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="lib__g-ic"><Ic size={22} strokeWidth={2} aria-hidden="true" /></span>
              <span className="lib__g-t">{t(`challenges.groups.${c}`)}</span>
            </button>
          );
        })}
      </div>

      {group === 'all' ? (
        GROUPS.map((g) => (
          <section key={g.id} className="lib__shelf" aria-labelledby={`shelf-${g.id}`}>
            <h2 id={`shelf-${g.id}`}><button type="button" onClick={() => setGroup(g.id)}>{t(`challenges.groups.${g.id}`)}</button></h2>
            <ul className="lib__row">
              {g.ids.filter((id) => id in CHALLENGES).map((id, i) => <Tile key={id} id={id} s={s} i={i} onPlay={() => play(id)} />)}
            </ul>
          </section>
        ))
      ) : (
        <ul className="lib__grid" key={group}>
          {GROUPS.find((g) => g.id === group)!.ids.filter((id) => id in CHALLENGES).map((id, i) => <Tile key={id} id={id} s={s} i={i} big onPlay={() => play(id)} />)}
        </ul>
      )}
    </div>
  );
}

// One challenge as a picture: its art fills the tile, the name and two small facts sit on it. Nothing to read.
function Tile({ id, s, i, big, onPlay }: { id: ChallengeId; s: AppState; i: number; big?: boolean; onPlay(): void }) {
  const { t } = useTranslation();
  const c = CHALLENGES[id];
  const name = t(`challenges.items.${id}.name`);
  const st = challengeStatus(s, id);
  return (
    <li className={`lib__tile ${big ? 'lib__tile--big' : ''}`} style={{ '--i': i } as React.CSSProperties}>
      <button type="button" className="lib__tile-b" onClick={onPlay} aria-label={t('challenges.playName', { name })}>
        <span className="lib__art" aria-hidden="true"><ChallengeArt id={id} /></span>
        {!st.tried && <span className="lib__new">{t('challenges.new')}</span>}
        <span className="lib__cap">
          <b dir="auto">{name}</b>
          <span className="lib__facts">
            <span><Clock size={12} aria-hidden="true" /> {t('common.minutes', { count: c.min })}</span>
            {c.xp > 0 && <span><Sparkles size={12} aria-hidden="true" /> {c.xp}</span>}
          </span>
        </span>
        <span className="lib__go" aria-hidden="true"><Play size={16} /></span>
      </button>
    </li>
  );
}
