import { motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui/kit';
import { useAppState } from '../../context/AppStateContext';
import { ChallengeCard } from '../../features/challenges/ChallengeCard';
import { CHALLENGES, GROUPS, type GroupId } from '../../features/challenges/catalog';
import { useMissions } from '../../features/mission/MissionProvider';
import { ProgramCard } from '../../features/program/ProgramCard';
import type { ChallengeId, ViewId } from '../../types';

const IDS = GROUPS.flatMap((g) => g.ids);

// One page for both: the journey in progress on top, then every activity grouped by what the user wants to do now.
export function Challenges({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const missions = useMissions();
  const [group, setGroup] = useState<'all' | GroupId>('all');
  const list = group === 'all' ? IDS : GROUPS.find((g) => g.id === group)!.ids;
  const play = (id: ChallengeId) => missions.start([{ id, why: [{ k: 'self' }], diff: 'normal' }]);
  return (
    <>
      <PageHeader title={t('challenges.title')} sub={t('challenges.sub')} />
      <ProgramCard onNavigate={onNavigate} />
      <h2 className="chal-groups__t">{t('challenges.groupLabel')}</h2>
      <div className="filters" role="group" aria-label={t('challenges.groupLabel')}>
        {(['all', ...GROUPS.map((g) => g.id)] as const).map((c) => (
          <button key={c} type="button" className={`flt ${group === c ? 'on' : ''}`} aria-pressed={group === c} onClick={() => setGroup(c)}>
            {group === c && <motion.span layoutId="flt-active" className="flt__pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            <span className="flt__t">{t(`challenges.groups.${c}`)}</span>
          </button>
        ))}
      </div>
      <div className="cc-grid">
        {list.filter((id) => id in CHALLENGES).map((id) => <ChallengeCard key={id} id={id} state={s} onPlay={() => play(id)} />)}
      </div>
    </>
  );
}
