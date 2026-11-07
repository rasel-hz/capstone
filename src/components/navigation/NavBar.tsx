import { motion } from 'motion/react';
import { BarChart3, Gamepad2, Gift, House, Map as MapIcon, MessageCircle, UserRound, type LucideIcon } from 'lucide-react';
import type { ViewId } from '../../types';

const TABS: [ViewId, string, LucideIcon][] = [
  ['home', 'الرئيسية', House], ['journeys', 'رحلاتي', MapIcon], ['chal', 'تحدياتي', Gamepad2], ['chat', 'خويّك', MessageCircle],
  ['prog', 'تطوري', BarChart3], ['rew', 'مكافآتي', Gift], ['set', 'ملفي', UserRound],
];

export function NavBar({ view, onNavigate }: { view: ViewId; onNavigate(v: ViewId): void }) {
  return (
    <nav aria-label="التنقل الرئيسي">
      <b>خويّك</b>
      {TABS.map(([id, label, Icon]) => (
        <button key={id} type="button" className={view === id ? 'on' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
          {view === id && <motion.span layoutId="nav-active" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <Icon className="nav-icon" size={19} aria-hidden="true" />
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
