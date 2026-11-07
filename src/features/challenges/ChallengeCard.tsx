import { Clock, Play, Sparkles, Target } from 'lucide-react';
import type { AppState, ChallengeId } from '../../types';
import { CHALLENGES } from './catalog';
import { ChallengeArt } from './ChallengeArt';

// Only real attempts appear here. A challenge nobody has finished says so, and never shows a default score.
export function challengeStatus(s: AppState, id: ChallengeId): { text: string; tried: boolean } {
  const done = s.hist.filter((h) => h.id === id && h.status === 'COMPLETED');
  if (!done.length) return { text: 'ما جربته للحين', tried: false };
  const scored = done.filter((h) => h.acc != null);
  const times = done.length === 1 ? 'مرة وحدة' : done.length === 2 ? 'مرتين' : `${done.length} مرات`;
  return { text: scored.length ? `${times} · آخر دقة ${scored[scored.length - 1].acc}%` : `كمّلته ${times}`, tried: true };
}

export function ChallengeCard({ id, state, onPlay, featured }: { id: ChallengeId; state: AppState; onPlay(): void; featured?: boolean }) {
  const c = CHALLENGES[id];
  const st = challengeStatus(state, id);
  return (
    <article className={`cc cc--${c.k} ${featured ? 'cc--feat' : ''}`}>
      <div className="cc__art"><ChallengeArt id={id} /></div>
      <div className="cc__body">
        <div className="cc__top">
          <span className="tag">{c.cat}</span>
          {c.hasEasy && <span className="tag tag--soft">فيه نسخة أسهل</span>}
        </div>
        <h3>{c.t}</h3>
        <p className="note flush">{featured ? c.purpose : c.desc}</p>
        <div className="meta">
          <span><Clock size={14} aria-hidden="true" /> {c.min === 1 ? 'دقيقة' : c.min === 2 ? 'دقيقتين' : `${c.min} دقائق`}</span>
          <span><Sparkles size={14} aria-hidden="true" /> {c.xp ? `${c.xp} نقطة` : 'بدون نقاط'}</span>
          {c.scored && <span><Target size={14} aria-hidden="true" /> فيه دقة</span>}
        </div>
        <div className="cc__foot">
          <span className={`cc__st ${st.tried ? 'is-tried' : ''}`}>{st.text}</span>
          <button type="button" className="btn sm" onClick={onPlay} aria-label={`العب ${c.t}`}><Play size={15} aria-hidden="true" /> العب</button>
        </div>
      </div>
    </article>
  );
}
