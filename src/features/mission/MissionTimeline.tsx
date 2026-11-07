import { Check, Clock, Minus, Play } from 'lucide-react';
import type { ChallengeId, Difficulty, ItemStatus } from '../../types';
import { ChallengeArt } from '../challenges/ChallengeArt';
import { CHALLENGES } from '../challenges/catalog';

export interface TimelineItem {
  id: ChallengeId;
  why?: string;
  diff?: Difficulty;
  status?: ItemStatus;
}

const label = (st?: ItemStatus, current?: boolean) => {
  if (st === 'COMPLETED') return 'مكتمل';
  if (st === 'SKIPPED') return 'متخطى';
  if (st === 'ABANDONED') return 'موقوف';
  return current ? 'الحالي' : '';
};

export function MissionTimeline({ items, current }: { items: TimelineItem[]; current?: number }) {
  return (
    <ol className="tl">
      {items.map((g, i) => {
        const c = CHALLENGES[g.id];
        const done = g.status === 'COMPLETED';
        const off = g.status === 'SKIPPED' || g.status === 'ABANDONED';
        const cur = current === i && !done && !off;
        const st = label(g.status, cur);
        return (
          <li key={`${g.id}-${i}`} className={`tl__i ${done ? 'is-done' : ''} ${off ? 'is-off' : ''} ${cur ? 'is-cur' : ''}`}>
            <span className="tl__n" aria-hidden="true">
              {done ? <Check size={16} /> : off ? <Minus size={16} /> : cur ? <Play size={14} /> : i + 1}
            </span>
            <div className="tl__art"><ChallengeArt id={g.id} /></div>
            <div className="grow tl__b">
              <div className="tl__t">
                <b>{c.t}</b>
                {st && <span className={`tag ${done ? 'tag--ok' : off ? 'tag--soft' : 'tag--cur'}`}>{st}</span>}
                {g.diff === 'easy' && <span className="tag tag--soft">أسهل</span>}
              </div>
              {g.why && <p className="note flush">{g.why}</p>}
            </div>
            <span className="tl__m"><Clock size={13} aria-hidden="true" /> {c.min} د</span>
          </li>
        );
      })}
    </ol>
  );
}
