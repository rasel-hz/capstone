import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../../../context/AppStateContext';
import type { GameResult } from '../../../types';
import { todayGoals } from '../../buddy/buddy';
import { buildPlanConfig, isPlanResult } from '../../plan/config';
import type { GameProps } from '../types';
import { AskNext, CrisisStop, crisisIn } from './parts';
import { PersonalPlanGame } from './PersonalPlanGame';

/**
 * "Arrange your day" (seq). Only ever the user's own tasks: from the chat, from today's open goals, or typed
 * here. It never shows example tasks. After the plan, the first "now" task can go straight to "Just the first step".
 */
export function SequenceGame(props: GameProps) {
  const { t } = useTranslation();
  const s = useAppState();
  const [cfg] = useState(() => props.cfg ?? buildPlanConfig(todayGoals(s).filter((g) => !g.done).map((g) => g.text)));
  const [plan, setPlan] = useState<GameResult | null>(null);
  const [crisis, setCrisis] = useState(false);

  if (!plan) {
    return (
      <PersonalPlanGame
        {...props}
        cfg={cfg}
        onDone={(r) => {
          const d = isPlanResult(r.data) ? r.data : null;
          const hit = !!d && crisisIn(...d.tasks.map((x) => x.text)) !== 0;
          // Nothing for "now" means nothing to start, so the plan is saved as it is.
          if (!hit && !firstNow(r)) return props.onDone(r);
          setCrisis(hit);
          setPlan(r);
        }}
      />
    );
  }

  const d = isPlanResult(plan.data) ? plan.data : null;
  const first = firstNow(plan);
  if (crisis || !first) return <CrisisStop level={crisisIn(...(d?.tasks.map((x) => x.text) ?? []))} onBack={() => props.onDone(plan)} />;
  return (
    <AskNext
      q={t('games.plan.startNowQ')}
      detail={first}
      yes={t('games.plan.startNowYes')}
      no={t('games.plan.startNowNo')}
      onYes={() => props.onDone({ ...plan, then: { id: 'micro_start', seed: { task: first, from: 'seq' } } })}
      onNo={() => props.onDone(plan)}
    />
  );
}

function firstNow(r: GameResult) {
  const d = isPlanResult(r.data) ? r.data : null;
  return d?.tasks.find((x) => x.id === d.now[0] && x.src === 'user')?.text;
}
