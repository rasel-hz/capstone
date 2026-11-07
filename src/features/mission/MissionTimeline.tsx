import { Check, Clock, Minus, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChallengeId, Difficulty, ItemStatus, Why } from '../../types';
import { ChallengeArt } from '../challenges/ChallengeArt';
import { CHALLENGES } from '../challenges/catalog';
import { whyText } from './planner';

export interface TimelineItem {
  id: ChallengeId;
  why?: Why;
  diff?: Difficulty;
  status?: ItemStatus;
}

const statusKey = (st?: ItemStatus, current?: boolean) => {
  if (st === 'COMPLETED') return 'player.status.completed';
  if (st === 'SKIPPED') return 'player.status.skipped';
  if (st === 'ABANDONED') return 'player.status.abandoned';
  return current ? 'player.status.current' : '';
};

export function MissionTimeline({ items, current }: { items: TimelineItem[]; current?: number }) {
  const { t } = useTranslation();
  return (
    <ol className="tl">
      {items.map((g, i) => {
        const c = CHALLENGES[g.id];
        const done = g.status === 'COMPLETED';
        const off = g.status === 'SKIPPED' || g.status === 'ABANDONED';
        const cur = current === i && !done && !off;
        const st = statusKey(g.status, cur);
        return (
          <li key={`${g.id}-${i}`} className={`tl__i ${done ? 'is-done' : ''} ${off ? 'is-off' : ''} ${cur ? 'is-cur' : ''}`}>
            <span className="tl__n" aria-hidden="true">
              {done ? <Check size={16} /> : off ? <Minus size={16} /> : cur ? <Play size={14} /> : i + 1}
            </span>
            <div className="tl__art"><ChallengeArt id={g.id} /></div>
            <div className="grow tl__b">
              <div className="tl__t">
                <b>{t(`challenges.items.${g.id}.name`)}</b>
                {st && <span className={`tag ${done ? 'tag--ok' : off ? 'tag--soft' : 'tag--cur'}`}>{t(st)}</span>}
                {g.diff === 'easy' && <span className="tag tag--soft">{t('player.easier')}</span>}
              </div>
              {g.why && <p className="note flush">{whyText(g.why)}</p>}
            </div>
            <span className="tl__m"><Clock size={13} aria-hidden="true" /> {t('common.minShort', { n: c.min })}</span>
          </li>
        );
      })}
    </ol>
  );
}
