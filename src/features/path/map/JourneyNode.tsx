import { Brain, Check, Clock, Flag, Hourglass, ListChecks, Lock, MessageCircle, Play, Rocket, Sparkles, Target, Wind, type LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CHALLENGES } from '../../challenges/catalog';
import type { ChallengeCategory } from '../../../types';
import type { NodeState, PathNode } from '../planner';
import { WORLD_W, type Stop } from '../world';

const CAT_ICON: Record<ChallengeCategory, LucideIcon> = { focus: Target, memory: Brain, planning: ListChecks, time: Hourglass, relax: Wind, real: Rocket };

// A six-sided stepping stone with soft corners.
const pebble = 'M31 7h34c6 0 11 3 14 8l13 24c2 5 2 10 0 15L79 79c-3 5-8 8-14 8H31c-6 0-11-3-14-8L4 54c-2-5-2-10 0-15l13-24c3-5 8-8 14-8z';

function iconFor(n: PathNode): LucideIcon {
  if (n.kind === 'talk') return MessageCircle;
  if (n.kind === 'reflect') return Sparkles;
  return n.id ? CAT_ICON[CHALLENGES[n.id].cat] : Clock;
}

/** A gate of two pillars and an arch: a checkpoint you walk through, not a badge on a list. */
function GateArt({ done }: { done: boolean }) {
  return (
    <svg className="jn__gate" viewBox="0 0 120 96" aria-hidden="true">
      <ellipse cx="60" cy="86" rx="52" ry="9" fill="#263D37" opacity=".14" />
      <path d="M22 86V44a38 34 0 0 1 76 0v42H82V46a22 20 0 0 0-44 0v40z" fill={done ? '#6D4FD1' : '#E9DFFF'} />
      <path d="M22 86V44a38 34 0 0 1 11-24l11 11a22 20 0 0 0-6 15v40z" fill={done ? '#A78BFA' : '#F4EEFF'} />
      <rect x="15" y="80" width="30" height="9" rx="4" fill={done ? '#FFD36E' : '#D8CDF2'} />
      <rect x="75" y="80" width="30" height="9" rx="4" fill={done ? '#FFD36E' : '#D8CDF2'} />
    </svg>
  );
}

export const JourneyNode = memo(function JourneyNode({ stop, node, state, name, height, fresh, resume, veiled = false, onOpen }: {
  stop: Stop;
  node: PathNode;
  state: NodeState;
  name: string;
  height: number;
  fresh: boolean;
  resume: boolean;
  /** In a chapter not reached yet: blurred and closed until the user gets there. */
  veiled?: boolean;
  onOpen(key: string): void;
}) {
  const { t } = useTranslation();
  const Ic = iconFor(node);
  const xp = node.kind === 'play' && node.id ? CHALLENGES[node.id].xp : 0;
  const mile = node.kind === 'milestone';
  return (
    <li
      className={`jn jn--${state} jn--${node.kind} ${fresh ? 'is-fresh' : ''} ${veiled ? 'is-veiled' : ''}`}
      aria-hidden={veiled || undefined}
      data-stop={node.key}
      style={{ left: `${(stop.x / WORLD_W) * 100}%`, top: `${(stop.y / height) * 100}%` }}
    >
      <button type="button" className="jn__hit" disabled={veiled} tabIndex={veiled ? -1 : undefined} onClick={() => onOpen(node.key)} aria-label={`${name}: ${t(`path.state.${state}`)}`} aria-current={state === 'current' ? 'step' : undefined}>
        {mile ? <GateArt done={state === 'done'} /> : state === 'current' ? (
          <svg className="jn__pad" viewBox="0 0 136 76" aria-hidden="true">
            <ellipse cx="68" cy="56" rx="62" ry="16" fill="#263D37" opacity=".14" />
            <ellipse cx="68" cy="46" rx="62" ry="24" fill="#1F5E48" />
            <ellipse cx="68" cy="40" rx="62" ry="24" fill="#28785B" />
            <ellipse cx="68" cy="39" rx="50" ry="17" fill="#FFD36E" />
          </svg>
        ) : (
          <svg className="jn__stone" viewBox="0 0 96 96" aria-hidden="true">
            <path d={pebble} transform="translate(0 6)" fill="#263D37" opacity=".16" />
            <path d={pebble} className="jn__fill" />
            <path d="M31 13h34c4 0 7 2 9 5H22c2-3 5-5 9-5z" fill="#fff" opacity=".4" />
          </svg>
        )}
        <span className="jn__ic">
          {state === 'done' && <Check size={mile ? 24 : 28} strokeWidth={3} aria-hidden="true" />}
          {state === 'locked' && !mile && <Ic size={24} aria-hidden="true" />}
          {state === 'locked' && mile && <Flag size={22} aria-hidden="true" />}
          {state === 'current' && mile && <Flag size={24} aria-hidden="true" />}
        </span>
        {state === 'locked' && !mile && <span className="jn__lock"><Lock size={12} aria-hidden="true" /></span>}
      </button>
      <div className="jn__lab">
        <b dir="auto">{name}</b>
        {!veiled && node.done && node.done.xp > 0 && <span className="jn__xp is-earned">{t('path.gotXp', { n: node.done.xp })}</span>}
        {!veiled && !node.done && xp > 0 && state !== 'current' && <span className="jn__xp">{t('path.canEarn', { n: xp })}</span>}
      </div>
      {state === 'current' && !mile && (
        <button type="button" className="btn sm jn__go" tabIndex={-1} aria-hidden="true" onClick={() => onOpen(node.key)}>
          <Play size={14} aria-hidden="true" /> {t(resume ? 'common.continue' : 'common.start')}
        </button>
      )}
    </li>
  );
});
