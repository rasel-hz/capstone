import { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { CHALLENGES } from '../../features/challenges/catalog';
import { useMissions } from '../../features/mission/MissionProvider';
import { lastAccuracy } from '../../features/mission/planner';
import type { ChallengeId } from '../../types';

export function Challenges() {
  const s = useAppState();
  const missions = useMissions();
  const [filter, setFilter] = useState('الكل');
  const cats = ['الكل', ...new Set(Object.values(CHALLENGES).map((c) => c.cat))];
  const list = (Object.entries(CHALLENGES) as [ChallengeId, (typeof CHALLENGES)[ChallengeId]][]).filter(([, c]) => filter === 'الكل' || c.cat === filter);
  return (
    <>
      <h1>تحدياتي</h1>
      <div>{cats.map((c) => <button key={c} type="button" className={`chip ${filter === c ? 'on' : ''}`} aria-pressed={filter === c} onClick={() => setFilter(c)}>{c}</button>)}</div>
      <br />
      <div className="grid">
        {list.map(([k, c]) => {
          const last = lastAccuracy(s, k);
          return (
            <div key={k} className="card lift">
              <h2 className="flush">{c.t}</h2>
              <p className="note">{c.cat} · +{c.xp} XP{last != null ? ' · آخر دقة ' + last + '%' : ''}</p>
              <button type="button" className="btn" onClick={() => missions.start([{ id: k, why: 'اخترته بنفسك', diff: 'normal' }])}>العب</button>
            </div>
          );
        })}
      </div>
    </>
  );
}
