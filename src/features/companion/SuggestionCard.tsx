import { Clock, Play, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CHALLENGES } from '../challenges/catalog';
import { ChallengeArt } from '../challenges/ChallengeArt';
import { useMissions } from '../mission/MissionProvider';
import { isLowEnergy, whyText } from '../mission/planner';
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
  const name = t(`challenges.items.${id}.name`);

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
  });

  if (sug.st) {
    return <p className="note sugc__done">{t(sug.st === 'started' ? 'companion.sug.started' : 'companion.sug.dismissed', { name })}</p>;
  }

  const reason = sug.i === 0 && sug.why ? sug.why : sug.goal ? whyText([{ k: sug.goal }]) : t(`challenges.items.${id}.purpose`);
  const blocked = !!s.driving;
  return (
    <div className="sugc" role="group" aria-label={t('companion.sug.label')}>
      <div className="sugc__art"><ChallengeArt id={id} /></div>
      <div className="sugc__body">
        <p className="eyebrow">{t('companion.sug.eyebrow')}</p>
        <b className="sugc__name">{name}</b>
        <span className="sugc__meta"><Clock size={13} aria-hidden="true" /> {t('common.minutes', { count: c.min })}</span>
        <p className="sugc__why" dir="auto">{reason}</p>
        <div className="sugc__act">
          <button type="button" className="btn sm" disabled={blocked} onClick={() => { setCard({ st: 'started' }); missions.start([item(id, true)]); }}>
            <Play size={14} aria-hidden="true" /> {t('common.start')}
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
        {sug.ids.length > 1 && (
          <button type="button" className="btn-link sugc__mission" disabled={blocked} onClick={() => { setCard({ st: 'started' }); missions.start(sug.ids.map((x, i) => item(x, i === 0))); }}>
            {t('companion.sug.mission', { count: sug.ids.length, mins: sug.ids.reduce((n, x) => n + CHALLENGES[x].min, 0) })}
          </button>
        )}
      </div>
    </div>
  );
}
