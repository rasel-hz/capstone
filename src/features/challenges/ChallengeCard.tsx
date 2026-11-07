import { Clock, Play, Sparkles, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { tr } from '../../i18n';
import type { AppState, ChallengeId } from '../../types';
import { CHALLENGES } from './catalog';
import { ChallengeArt } from './ChallengeArt';

// Only real attempts appear here. A challenge nobody has finished says so, and never shows a default score.
export function challengeStatus(s: AppState, id: ChallengeId): { text: string; tried: boolean } {
  const done = s.hist.filter((h) => h.id === id && h.status === 'COMPLETED');
  if (!done.length) return { text: tr('challenges.notTried'), tried: false };
  const scored = done.filter((h) => h.acc != null);
  const times = tr('challenges.times', { count: done.length });
  return { text: scored.length ? tr('challenges.timesAcc', { times, acc: scored[scored.length - 1].acc }) : tr('challenges.timesDone', { times }), tried: true };
}

export function ChallengeCard({ id, state, onPlay, featured }: { id: ChallengeId; state: AppState; onPlay(): void; featured?: boolean }) {
  const { t } = useTranslation();
  const c = CHALLENGES[id];
  const st = challengeStatus(state, id);
  const name = t(`challenges.items.${id}.name`);
  return (
    <article className={`cc cc--${c.k} ${featured ? 'cc--feat' : ''}`}>
      <div className="cc__art"><ChallengeArt id={id} /></div>
      <div className="cc__body">
        <div className="cc__top">
          <span className="tag">{t(`challenges.categories.${c.cat}`)}</span>
          {c.hasEasy && <span className="tag tag--soft">{t('challenges.hasEasy')}</span>}
        </div>
        <h3>{name}</h3>
        <p className="note flush">{t(`challenges.items.${id}.${featured ? 'purpose' : 'desc'}`)}</p>
        <div className="meta">
          <span><Clock size={14} aria-hidden="true" /> {t('common.minutes', { count: c.min })}</span>
          <span><Sparkles size={14} aria-hidden="true" /> {c.xp ? t('common.points', { count: c.xp }) : t('common.noPoints')}</span>
          {c.scored && <span><Target size={14} aria-hidden="true" /> {t('challenges.scored')}</span>}
        </div>
        <div className="cc__foot">
          <span className={`cc__st ${st.tried ? 'is-tried' : ''}`}>{st.text}</span>
          <button type="button" className="btn sm" onClick={onPlay} aria-label={t('challenges.playName', { name })}><Play size={15} aria-hidden="true" /> {t('challenges.play')}</button>
        </div>
      </div>
    </article>
  );
}
