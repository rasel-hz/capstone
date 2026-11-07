import { motion } from 'motion/react';
import { BarChart3, Gamepad2, Gift, House, Map as MapIcon, MessageCircle, UserRound, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ViewId } from '../../types';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

const TABS: [ViewId, LucideIcon][] = [
  ['home', House], ['journeys', MapIcon], ['chal', Gamepad2], ['chat', MessageCircle], ['prog', BarChart3], ['rew', Gift], ['set', UserRound],
];

export function NavBar({ view, onNavigate }: { view: ViewId; onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('nav.label')}>
      <b>{t('common.brand')}</b>
      {TABS.map(([id, Icon]) => (
        <button key={id} type="button" className={view === id ? 'on' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
          {view === id && <motion.span layoutId="nav-active" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <Icon className="nav-icon" size={19} aria-hidden="true" />
          <span className="nav-label">{t(`nav.${id}`)}</span>
        </button>
      ))}
      <LanguageSwitcher />
    </nav>
  );
}
