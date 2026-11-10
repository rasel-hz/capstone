import { ArrowRight, Ear, Eye, Flower2, Hand, Heart, Leaf, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Counter, tap } from '../../dhikr/DhikrGame';
import type { GameProps } from '../types';

// Noticing what is around you, one sense at a time. The counts are this app's own sequence and are
// fixed on purpose: 5 things seen, 3 heard, 3 touched, 2 smelled, 1 tasted. Any sense can be skipped,
// so nobody has to tap a number that isn't true for them.
export const STAGES: { id: 'see' | 'hear' | 'touch' | 'smell' | 'taste'; n: number; icon: LucideIcon }[] = [
  { id: 'see', n: 5, icon: Eye },
  { id: 'hear', n: 3, icon: Ear },
  { id: 'touch', n: 3, icon: Hand },
  { id: 'smell', n: 2, icon: Flower2 },
  { id: 'taste', n: 1, icon: Leaf },
];
export type StageResult = { id: string; count: number; skipped: boolean };
/** Done once at least one sense was really noticed. Skipping every stage isn't a completion. */
export const groundingDone = (r: StageResult[]) => r.some((x) => !x.skipped && x.count >= (STAGES.find((s) => s.id === x.id)?.n ?? Infinity));

export function GroundingGame({ env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [i, setI] = useState(-1);
  const [res, setRes] = useState<StageResult[]>(() => STAGES.map((s) => ({ id: s.id, count: 0, skipped: false })));
  const sent = useRef(false);
  const next = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    env.say('calm', 'games.ground.introSay');
    return () => clearTimeout(next.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (i >= 0 && i < STAGES.length) env.round(i + 1, STAGES.length, 'games.ground.round'); }, [i, env]);

  const go = (to: number) => {
    clearTimeout(next.current);
    setI(to);
    if (to >= 0 && to < STAGES.length) env.say('calm', `games.ground.say.${STAGES[to].id}`);
    if (to === STAGES.length) env.say('happy', 'games.ground.doneSay');
  };

  function onTap() {
    const s = STAGES[i];
    const now = tap([res[i].count], 0, s.n)[0];
    setRes((r) => r.map((x, k) => (k === i ? { ...x, count: now, skipped: false } : x)));
    if (now >= s.n) {
      env.sfx('tap');
      // A short pause to see the full ring, then the next sense.
      next.current = setTimeout(() => go(i + 1), env.rm ? 300 : 900);
    }
  }
  function skip() {
    setRes((r) => r.map((x, k) => (k === i ? { ...x, skipped: true } : x)));
    go(i + 1);
  }
  function finish() {
    if (sent.current || !groundingDone(res)) return;
    sent.current = true;
    onDone({ acc: null, retries: 0, mood: 'calm', say: 'games.ground.doneSay', data: { stages: res } });
  }

  if (i < 0) {
    return (
      <div className="scene gr">
        <span className="gr__icon" aria-hidden="true"><Leaf size={32} /></span>
        <h2 className="q__t">{t('games.ground.title')}</h2>
        <p className="center">{t('games.ground.lead')}</p>
        <div className="row row--c"><button type="button" className="btn" onClick={() => go(0)}>{t('games.ground.start')}</button></div>
      </div>
    );
  }

  if (i >= STAGES.length) {
    const ok = groundingDone(res);
    return (
      <div className="scene gr">
        <span className="gr__icon gr__icon--done" aria-hidden="true"><Heart size={32} /></span>
        <h2 className="q__t" role="status">{ok ? t('games.ground.done') : t('games.ground.noneTitle')}</h2>
        {!ok && <p className="note center">{t('games.ground.noneText')}</p>}
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => go(STAGES.length - 1)}><ArrowRight size={16} className="flip" aria-hidden="true" /> {t('common.back')}</button>
          {ok && <button type="button" className="btn" onClick={finish}>{t('games.ground.finish')}</button>}
        </div>
      </div>
    );
  }

  const s = STAGES[i];
  const Icon = s.icon;
  const doneCount = res.filter((x, k) => k < i || (k === i && x.count >= s.n)).length;
  return (
    <div className="scene gr" key={s.id}>
      <div className="gr-dots" aria-hidden="true">
        {STAGES.map((x, k) => <i key={x.id} className={k < i ? (res[k].skipped ? 'is-skip' : 'is-done') : k === i ? 'is-now' : ''} />)}
      </div>
      <p className="sr-only">{t('games.ground.progress', { n: doneCount, total: STAGES.length })}</p>
      <span className="gr__icon" aria-hidden="true"><Icon size={30} /></span>
      <h2 className="q__t">{t(`games.ground.stages.${s.id}.title`)}</h2>
      <p className="center">{t(`games.ground.stages.${s.id}.text`)}</p>
      <Counter label={t(`games.ground.stages.${s.id}.title`)} count={res[i].count} target={s.n} still={env.rm} onTap={onTap} onReset={() => setRes((r) => r.map((x, k) => (k === i ? { ...x, count: 0 } : x)))} />
      <div className="row row--c">
        {i > 0 && <button type="button" className="btn-link" onClick={() => go(i - 1)}><ArrowRight size={14} className="flip" aria-hidden="true" /> {t('common.back')}</button>}
        {res[i].count < s.n && <button type="button" className="btn-link" onClick={skip}>{t('games.ground.skip')}</button>}
        {res[i].count >= s.n && <button type="button" className="btn" onClick={() => go(i + 1)}>{t('games.ground.next')}</button>}
      </div>
    </div>
  );
}
