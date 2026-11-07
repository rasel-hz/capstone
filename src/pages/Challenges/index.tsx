import { motion } from 'motion/react';
import { useState } from 'react';
import { PageHeader } from '../../components/ui/kit';
import { useAppState } from '../../context/AppStateContext';
import { ChallengeCard } from '../../features/challenges/ChallengeCard';
import { CATEGORIES, CHALLENGES } from '../../features/challenges/catalog';
import { useMissions } from '../../features/mission/MissionProvider';
import type { AppState, ChallengeId } from '../../types';

const ALL = 'الكل';
const IDS = Object.keys(CHALLENGES) as ChallengeId[];

// Features something the user hasn't tried yet, or their least recent one. It's a browsing aid, not a recommendation engine.
function featuredId(s: AppState): ChallengeId {
  const untried = IDS.find((id) => !s.hist.some((h) => h.id === id && h.status === 'COMPLETED'));
  if (untried) return untried;
  const lastPlayed = (id: ChallengeId) => Math.max(0, ...s.hist.filter((h) => h.id === id).map((h) => h.ts));
  return [...IDS].sort((a, b) => lastPlayed(a) - lastPlayed(b))[0];
}

export function Challenges() {
  const s = useAppState();
  const missions = useMissions();
  const [filter, setFilter] = useState(ALL);
  const [featured] = useState(() => featuredId(s));
  const list = IDS.filter((id) => (filter === ALL ? id !== featured : CHALLENGES[id].cat === filter));
  const play = (id: ChallengeId) => missions.start([{ id, why: 'اخترته بنفسك', diff: 'normal' }]);
  return (
    <>
      <PageHeader title="تحدياتي" sub="ألعاب قصيرة تجربها على راحتك. هي للمتابعة الشخصية، مو قياس لصحتك." />
      {filter === ALL && (
        <section aria-label="تحدي مقترح للتجربة" className="feat">
          <p className="eyebrow">جرّب هذا</p>
          <ChallengeCard id={featured} state={s} onPlay={() => play(featured)} featured />
        </section>
      )}
      <div className="filters" role="group" aria-label="فلترة حسب النوع">
        {[ALL, ...CATEGORIES].map((c) => (
          <button key={c} type="button" className={`flt ${filter === c ? 'on' : ''}`} aria-pressed={filter === c} onClick={() => setFilter(c)}>
            {filter === c && <motion.span layoutId="flt-active" className="flt__pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            <span className="flt__t">{c}</span>
          </button>
        ))}
      </div>
      <div className="cc-grid">
        {list.map((id) => <ChallengeCard key={id} id={id} state={s} onPlay={() => play(id)} />)}
      </div>
    </>
  );
}
