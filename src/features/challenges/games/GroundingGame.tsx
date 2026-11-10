import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimers } from '../../../hooks/useTimers';
import type { GameResult } from '../../../types';
import type { GameProps } from '../types';
import { HeavySupport } from './parts';

// The 5-4-3-2-1 senses exercise: it brings attention back to the place you're in. It can calm a little;
// it isn't a treatment. Nothing is typed: the user taps once for each thing they notice.
const SENSES = [{ id: 'see', n: 5 }, { id: 'touch', n: 4 }, { id: 'hear', n: 3 }, { id: 'smell', n: 2 }, { id: 'taste', n: 1 }] as const;
const EXAMPLES = ['a', 'b', 'c'];
const LEVELS = [1, 2, 3, 4, 5];
// 4 or 5 after the exercise means it still feels heavy, so support comes first.
const HEAVY = 4;

/** "What's around you?" (grounding). A rating before and after, five senses in between, and support if it's still heavy. */
export function GroundingGame({ env, onDone }: GameProps) {
  const { t } = useTranslation();
  const timers = useTimers(env.paused);
  const [phase, setPhase] = useState<'before' | 'sense' | 'after' | 'heavy'>('before');
  const [before, setBefore] = useState<number | null>(null);
  const [after, setAfter] = useState<number | null>(null);
  const [i, setI] = useState(0);
  const [found, setFound] = useState<number[]>([0, 0, 0, 0, 0]);
  const sense = SENSES[i];

  useEffect(() => {
    if (phase === 'sense') {
      env.round(i + 1, SENSES.length, 'games.common.step');
      env.say('calm', `games.grounding.say.${sense.id}`);
    } else {
      env.round(0, 0);
      env.say(phase === 'heavy' ? 'concerned' : 'calm', `games.grounding.say.${phase}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i]);

  function next() {
    if (i + 1 < SENSES.length) setI(i + 1);
    else setPhase('after');
  }

  function tap() {
    if (found[i] >= sense.n) return;
    const n = found.map((v, k) => (k === i ? v + 1 : v));
    setFound(n);
    env.sfx('tap');
    if (n[i] >= sense.n) timers.after(next, 600);
  }

  const result = (go?: 'chat'): GameResult => ({
    acc: null, retries: 0, mood: 'calm', say: 'games.grounding.said', data: { before, after, found }, ...(go ? { go } : {}),
  });
  function finish(level: number | null) {
    env.sfx('ok');
    if (level != null && level >= HEAVY) setPhase('heavy');
    else onDone(result());
  }

  if (phase === 'before' || phase === 'after') {
    const value = phase === 'before' ? before : after;
    const set = phase === 'before' ? setBefore : setAfter;
    return (
      <div className="scene form">
        <h2 className="q__t">{t(phase === 'before' ? 'games.grounding.beforeQ' : 'games.grounding.afterQ')}</h2>
        <div className="scale" role="group" aria-label={t('games.grounding.scale')}>
          {LEVELS.map((n) => (
            <button key={n} type="button" className={`scale__b ${value === n ? 'on' : ''}`} aria-pressed={value === n} onClick={() => set(n)}>
              <i style={{ height: 2 + n * 8 }} aria-hidden="true" />{t(`games.grounding.levels.${n}`)}
            </button>
          ))}
        </div>
        <div className="row row--c">
          {phase === 'before'
            ? <button type="button" className="btn" onClick={() => setPhase('sense')}>{t(value ? 'common.next' : 'common.skip')}</button>
            : <button type="button" className="btn" onClick={() => finish(value)}>{t(value ? 'games.grounding.finish' : 'common.skip')}</button>}
        </div>
      </div>
    );
  }

  if (phase === 'heavy') {
    return (
      <div className="scene form">
        <HeavySupport text={t('games.grounding.heavy')} onChat={() => onDone(result('chat'))} />
        <div className="row row--c"><button type="button" className="btn alt" onClick={() => onDone(result())}>{t('games.grounding.finish')}</button></div>
      </div>
    );
  }

  const got = found[i];
  return (
    <div className="scene q gr">
      <h2 className="q__t">{t(`games.grounding.senses.${sense.id}.q`)}</h2>
      <div className="gr__dots" role="img" aria-label={t('games.grounding.progress', { found: got, total: sense.n })}>
        {Array.from({ length: sense.n }, (_, k) => <i key={k} className={k < got ? 'on' : ''} />)}
      </div>
      <div className="tags tags--c" aria-label={t('games.common.examples')}>
        {EXAMPLES.map((x) => <span key={x} className="tag">{t(`games.grounding.senses.${sense.id}.ex.${x}`)}</span>)}
      </div>
      <div className="row row--c">
        <button type="button" className="btn btn--lg" disabled={got >= sense.n} onClick={tap}>{t('games.grounding.found')}</button>
      </div>
      <div className="row row--c">
        <button type="button" className="btn-link" onClick={next}>{t(got ? 'games.grounding.moveOn' : 'games.grounding.none')}</button>
      </div>
    </div>
  );
}
