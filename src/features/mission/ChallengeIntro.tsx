import {
  BookOpen, CalendarClock, CircleCheck, CircleHelp, Clapperboard, ClipboardList, Clock, Coffee, Columns3, Compass, Ear, Eye, EyeOff, Footprints, Gauge, Hand,
  HandHeart, Heart, Images, ListOrdered, ListPlus, Moon, MousePointerClick, PenLine, Play, Repeat, Search, SlidersHorizontal, Smile, Sparkles, Sun, Target, Timer, Wind,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Segmented } from '../../components/ui/kit';
import type { ChallengeId, Difficulty } from '../../types';
import { CHALLENGES } from '../challenges/catalog';
import { ChallengeArt } from '../challenges/ChallengeArt';

// Three drawn icons for "how to play", one per step. Never emoji. Text is under challenges.items.<id>.how.
const HOW: Partial<Record<ChallengeId, [LucideIcon, LucideIcon, LucideIcon]>> = {
  micro_start: [PenLine, Footprints, Timer],
  breakdown: [ClipboardList, ListOrdered, CalendarClock],
  seq: [ListPlus, Columns3, Clock],
  study_sprint: [Target, Timer, Coffee],
  video: [Clapperboard, Eye, CircleHelp],
  attention_scene: [Images, Search, MousePointerClick],
  mem: [Eye, EyeOff, CircleCheck],
  calm: [SlidersHorizontal, Wind, Smile],
  calm_landscape: [Compass, Coffee, Smile],
  thought_sort: [PenLine, Columns3, Footprints],
  emotion_map: [Heart, Gauge, HandHeart],
  eye_rest: [Eye, Timer, Smile],
  grounding: [Eye, Hand, Ear],
  dhikr_morning: [Sun, BookOpen, Repeat],
  dhikr_evening: [Moon, BookOpen, Repeat],
  dhikr_calm_heart: [Heart, BookOpen, Repeat],
  dhikr_moment: [Sparkles, BookOpen, Repeat],
  dhikr_sleep: [Moon, BookOpen, Repeat],
};

// Quiet challenges get a calm entrance: no breathing button, and a gentler call to start.
const QUIET: ChallengeId[] = ['calm', 'calm_landscape', 'emotion_map', 'eye_rest', 'grounding', 'thought_sort', 'dhikr_morning', 'dhikr_evening', 'dhikr_calm_heart', 'dhikr_moment', 'dhikr_sleep'];

/**
 * The page before a single challenge: its art, name, three steps on how to play, length and points, and one
 * button that starts the game itself. Everything settles in one after another; with reduced motion it simply shows.
 */
export function ChallengeIntro({ id, name, diff, onDiff, onStart }: { id: ChallengeId; name: string; diff: Difficulty; onDiff(d: Difficulty): void; onStart(): void }) {
  const { t } = useTranslation();
  const c = CHALLENGES[id];
  const icons = HOW[id];
  const quiet = QUIET.includes(id);
  return (
    <div className={`ci ${quiet ? 'ci--quiet' : ''}`}>
      <div className="ci__art ci-in" style={{ '--d': 0 } as React.CSSProperties}><ChallengeArt id={id} /></div>
      <h1 className="ci-in" style={{ '--d': 1 } as React.CSSProperties}>{name}</h1>
      <p className="ci__lead ci-in" style={{ '--d': 2 } as React.CSSProperties}>{t(`challenges.items.${id}.desc`)}</p>

      {icons && (
        <section className="ci__how ci-in" style={{ '--d': 3 } as React.CSSProperties} aria-labelledby="ci-how">
          <h2 id="ci-how">{t('player.intro.how')}</h2>
          <ol>
            {icons.map((Ic, i) => (
              <li key={i} className="ci-in" style={{ '--d': 4 + i } as React.CSSProperties}>
                <span className="ci__n" aria-hidden="true">{i + 1}</span>
                <span className="ci__ic"><Ic size={26} strokeWidth={1.9} aria-hidden="true" /></span>
                <span className="ci__t">{t(`challenges.items.${id}.how.${i + 1}`)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="ci__facts ci-in" style={{ '--d': 7 } as React.CSSProperties}>
        <span><Clock size={18} aria-hidden="true" /><b>{t('common.minutes', { count: c.min })}</b><small>{t('player.intro.length')}</small></span>
        <span><Sparkles size={18} aria-hidden="true" /><b>{c.xp ? t('common.points', { count: c.xp }) : t('common.noPoints')}</b><small>{t('player.intro.points')}</small></span>
      </div>

      {c.hasEasy && (
        <div className="ci-in" style={{ '--d': 8 } as React.CSSProperties}>
          <Segmented<Difficulty> className="seg--c" label={t('player.difficulty')} value={diff} options={[{ value: 'normal', label: t('player.normal') }, { value: 'easy', label: t('player.easier') }]} onChange={onDiff} />
        </div>
      )}

      <button type="button" className="btn btn--lg ci__go ci-in" style={{ '--d': 9 } as React.CSSProperties} onClick={onStart}>
        <Play size={18} aria-hidden="true" /> {t(quiet ? 'player.intro.goQuiet' : 'player.intro.go')}
      </button>
    </div>
  );
}
