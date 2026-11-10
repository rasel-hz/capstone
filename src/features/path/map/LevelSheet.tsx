import { Clock, Gauge, Lock, MessageCircle, Play, RotateCcw, Shuffle, Sparkles, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CHALLENGES } from '../../challenges/catalog';
import { ChallengeArt } from '../../challenges/ChallengeArt';
import { potentialXp, type NodeState, type PathNode } from '../planner';

const Fact = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => <li>{icon}<span>{children}</span></li>;

/** Details for one step. A bottom sheet on a phone, a centred card on a wider screen. */
export function LevelSheet({ node, state, name, position, total, resume, rm, swapsLeft, onClose, onStart, onSwap, onReplay, onTalk, onReflect }: {
  node: PathNode;
  state: NodeState;
  name: string;
  position: number;
  total: number;
  resume: boolean;
  rm: boolean;
  /** How many more times the current step can be swapped for another. */
  swapsLeft: number;
  onClose(): void;
  onSwap(): void;
  onStart(): void;
  onReplay(): void;
  onTalk(): void;
  onReflect(): void;
}) {
  const { t } = useTranslation();
  const system = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const c = node.id ? CHALLENGES[node.id] : null;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); before?.focus?.(); };
  }, [onClose]);

  const describe = node.id ? t(`challenges.items.${node.id}.purpose`) : t(`path.nodeText.${node.kind}`);
  const reflectNow = node.kind === 'reflect' && state === 'current';

  return (
    <div className="lsheet" role="dialog" aria-modal="true" aria-label={name} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div ref={ref} className="lsheet__card" initial={rm || system ? false : { y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
        <span className="lsheet__grab" aria-hidden="true" />
        <button type="button" className="lsheet__x" aria-label={t('common.close')} onClick={onClose}><X size={18} aria-hidden="true" /></button>
        <div className="lsheet__top">
          {node.id && <div className="lsheet__art"><ChallengeArt id={node.id} /></div>}
          <div className="grow">
            <p className="eyebrow">{t('path.sheet.step', { n: position, total })}</p>
            <h2 dir="auto">{name}</h2>
          </div>
        </div>
        {reflectNow ? (
          <>
            <p>{t('path.reflectQ')}</p>
            <div className="lsheet__act">
              {(['good', 'okay', 'not'] as const).map((k) => <button key={k} type="button" className="btn sm alt" onClick={onReflect}>{t(`path.reflect.${k}`)}</button>)}
            </div>
          </>
        ) : (
          <>
            <p className="lsheet__desc">{describe}</p>
            <ul className="lsheet__facts">
              {c && <Fact icon={<Clock size={15} aria-hidden="true" />}>{t('common.minutes', { count: c.min })}</Fact>}
              {node.done
                ? node.done.xp > 0 && <Fact icon={<Sparkles size={15} aria-hidden="true" />}>{t('path.youEarned', { n: node.done.xp })}</Fact>
                : potentialXp(node) > 0 && <Fact icon={<Sparkles size={15} aria-hidden="true" />}>{t('path.canEarn', { n: potentialXp(node) })}</Fact>}
              {c?.hasEasy && <Fact icon={<Gauge size={15} aria-hidden="true" />}>{t('path.sheet.hasEasy')}</Fact>}
            </ul>
            {state === 'locked' && <p className="lsheet__locked"><Lock size={14} aria-hidden="true" /> {t('path.lockedNote')}</p>}
            <div className="lsheet__act">
              {state === 'current' && node.kind === 'play' && <button type="button" className="btn btn--lg" onClick={onStart}><Play size={17} aria-hidden="true" /> {t(resume ? 'common.continue' : 'common.start')}</button>}
              {state === 'current' && node.kind === 'play' && !resume && swapsLeft > 0 && <button type="button" className="btn-link" onClick={onSwap}><Shuffle size={15} aria-hidden="true" /> {t('path.swap')}</button>}
              {state === 'current' && node.kind === 'talk' && <button type="button" className="btn btn--lg" onClick={onTalk}><MessageCircle size={17} aria-hidden="true" /> {t('path.talkNow')}</button>}
              {node.done && node.kind === 'play' && <button type="button" className="btn alt" onClick={onReplay}><RotateCcw size={15} aria-hidden="true" /> {t('path.replay')}</button>}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
