import { motion } from 'motion/react';
import type { ViewId } from '../../types';

const TABS: [ViewId, string][] = [
  ['home', 'الرئيسية'], ['journeys', 'رحلاتي'], ['chal', 'تحدياتي'], ['chat', 'خويّك'], ['prog', 'تطوري'], ['rew', 'مكافآتي'], ['set', 'ملفي'],
];

export function NavBar({ view, onNavigate }: { view: ViewId; onNavigate(v: ViewId): void }) {
  return (
    <nav aria-label="التنقل الرئيسي">
      <b>خويّك</b>
      {TABS.map(([id, label]) => (
        <button key={id} type="button" className={view === id ? 'on' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
          {view === id && <motion.span layoutId="nav-active" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
