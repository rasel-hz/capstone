import { Clock, ListChecks, Play, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CHALLENGES } from '../challenges/catalog';
import { ChallengeArt } from '../challenges/ChallengeArt';
import { useMissions } from '../mission/MissionProvider';
import { isLowEnergy, whyText } from '../mission/planner';
import { formatList, iso } from '../../i18n';
import { useAppState, useStore } from '../../context/AppStateContext';
import type { ChatSuggestion, PlannedItem } from '../../types';

// A compact, optional activity card in the chat. Nothing starts until the user presses Start.
export function SuggestionCard({ index, sug }: { index: number; sug: ChatSuggestion }) {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const missions = useMissions();
  const id = sug.ids[sug.i] ?? sug.ids[0];
  const c = CHALLENGES[id];
  // The planning board with the user's own tasks. Only for seq, and only when the chat gave tasks or asked for them.
  const plan = id === 'seq' ? sug.cfg : undefined;
  const mine = plan?.tasks.filter((x) => x.src === 'user').map((x) => x.text) ?? [];
  const name = plan ? t('companion.sug.planName') : t(`challenges.items.${id}.name`);

  const setCard = (patch: Partial<ChatSuggestion>) =>
    store.update((d) => {
      const m = d.chat[index];
      if (m?.sug) Object.assign(m.sug, patch);
    });

  const item = (cid: typeof id, first: boolean): PlannedItem => ({
    id: cid,
    // The AI's written reason fits only its first pick; others use a reason code that follows the language.
    why: first && sug.i === 0 && sug.why ? sug.why : sug.goal ? [{ k: sug.goal }] : [{ k: 'chat' }],
    diff: CHALLENGES[cid].hasEasy && isLowEnergy(s) ? 'easy' : 'normal',
    // The planning board and "just the first step" can both use the tasks the user named.
    ...((cid === 'seq' || cid === 'micro_start') && sug.cfg ? { cfg: sug.cfg } : {}),
  });

  if (sug.st) {
    return <p className="note sugc__done">{t(sug.st === 'started' ? 'companion.sug.started' : 'companion.sug.dismissed', { name })}</p>;
  }

  const reason = plan
    ? mine.length
      ? t('companion.sug.planWhy', { tasks: formatList(mine.map(iso)) })
      : t('companion.sug.planEmpty')
    : sug.i === 0 && sug.why ? sug.why : sug.goal ? whyText([{ k: sug.goal }]) : t(`challenges.items.${id}.purpose`);
  const blocked = !!s.driving;
  return (
    <div className="sugc" role="group" aria-label={t('companion.sug.label')}>
      <div className="sugc__art"><ChallengeArt id={id} /></div>
      <div className="sugc__body">
        <p className="eyebrow">{t('companion.sug.eyebrow')}</p>
        <b className="sugc__name">{name}</b>
        <span className="sugc__meta">
          {plan ? <><ListChecks size={13} aria-hidden="true" /> {t('companion.sug.planMeta', { count: mine.length })}</> : <><Clock size={13} aria-hidden="true" /> {t('common.minutes', { count: c.min })}</>}
        </span>
        {mine.length > 0 && <ul className="sugc__tasks">{mine.map((x) => <li key={x} dir="auto">{x}</li>)}</ul>}
        <p className="sugc__why" dir="auto">{reason}</p>
        <div className="sugc__act">
          <button type="button" className="btn sm" disabled={blocked} onClick={() => { setCard({ st: 'started' }); missions.start([item(id, true)]); }}>
            <Play size={14} aria-hidden="true" /> {t(plan ? 'companion.sug.planStart' : 'common.start')}
          </button>
          {sug.ids.length > 1 && (
            <button type="button" className="btn sm alt" onClick={() => setCard({ i: (sug.i + 1) % sug.ids.length })}>
              <RefreshCw size={14} aria-hidden="true" /> {t('companion.sug.another')}
            </button>
          )}
          <button type="button" className="btn sm alt" onClick={() => setCard({ st: 'dismissed' })}>
            <X size={14} aria-hidden="true" /> {t('companion.sug.notNow')}
          </button>
        </div>
        {sug.ids.length > 1 && !plan && (
          <button type="button" className="btn-link sugc__mission" disabled={blocked} onClick={() => { setCard({ st: 'started' }); missions.start(sug.ids.map((x, i) => item(x, i === 0))); }}>
            {t('companion.sug.mission', { mins: sug.ids.reduce((n, x) => n + CHALLENGES[x].min, 0) })}
          </button>
        )}
      </div>
    </div>
  );
}
