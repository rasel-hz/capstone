import { motion } from 'motion/react';
import { House, Map as MapIcon, MessageCircle, Trophy, UserRound, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ViewId } from '../../types';
import { Mascot } from '../mascot/Mascot';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { LogoutButton } from '../../features/auth/AuthViews';

// Five tabs, with the buddy raised. Journeys open from the Challenges page. Progress and Rewards share one
// "Achievements" tab and switch with the sub-tabs at the top of the page (see SubTabs).
const TABS: [ViewId, LucideIcon][] = [
  ['home', House], ['path', MapIcon], ['chat', MessageCircle], ['prog', Trophy], ['set', UserRound],
];
// A tab whose label differs from its first page's name.
const TAB_LABEL: Partial<Record<ViewId, string>> = { prog: 'nav.achievements', path: 'nav.myJourney' };

// The tab that stays lit for a view reached through a sub-tab.
// The challenge library and the old journeys are reached from "My journey", so that tab stays lit.
export const TAB_OF: Partial<Record<ViewId, ViewId>> = { journeys: 'path', chal: 'path', dhikr: 'path', rew: 'prog' };

export function NavBar({ view, onNavigate }: { view: ViewId; onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const active = TAB_OF[view] ?? view;
  return (
    <nav aria-label={t('nav.label')}>
      <b>{t('common.brand')}</b>
      {TABS.map(([id, Icon]) => (
        <button key={id} type="button" className={`${active === id ? 'on' : ''} ${id === 'chat' ? 'nav-buddy' : ''}`} aria-current={active === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
          {active === id && <motion.span layoutId="nav-active" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <Icon className="nav-icon" size={19} aria-hidden="true" />
          {id === 'chat' && <span className="nav-buddy__face" aria-hidden="true"><Mascot state="idle" size={46} still /></span>}
          <span className="nav-label">{t(TAB_LABEL[id] ?? `nav.${id}`)}</span>
        </button>
      ))}
      <LanguageSwitcher />
      <LogoutButton />
    </nav>
  );
}

// Two pages that share one tab switch here. Journeys aren't a sub-tab: they open from the journey card on Challenges.
const SUB: Partial<Record<ViewId, [ViewId, ViewId]>> = { prog: ['prog', 'rew'], rew: ['prog', 'rew'] };

export function SubTabs({ view, onNavigate }: { view: ViewId; onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const pair = SUB[view];
  if (!pair) return null;
  return (
    <div className="seg subtabs" role="group" aria-label={t(`nav.${pair[0]}`)}>
      {pair.map((id) => (
        <button key={id} type="button" className={`seg__b ${view === id ? 'on' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
          <span>{t(`nav.${id}`)}</span>
        </button>
      ))}
    </div>
  );
}
