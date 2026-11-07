import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimers } from '../../../hooks/useTimers';
import { tr } from '../../../i18n';
import { shuffled } from '../../../utils';
import { COLOR_IDS, COLORS, SHAPES } from '../catalog';
import type { GameProps } from '../types';
import { HintButton } from './parts';

interface Obj { k: string; c: number }
const SHOW_MS = 5000;
const same = (a: Obj, b: Obj) => a.k === b.k && a.c === b.c;
const colorName = (c: number) => tr(`games.colors.${COLOR_IDS[c]}`);
const describe = (o: Obj) => tr('games.mem.object', { shape: tr(`games.shapes.${o.k}`), color: colorName(o.c) });

// The answer options include objects that weren't on the tray: the same shape in another color and
// another shape in the same color. Otherwise the answer is just the one you can't see any more.
export function makeRound(n: number) {
  const keys = shuffled(Object.keys(SHAPES));
  const cols = shuffled([0, 1, 2, 3, 4, 5]);
  const items: Obj[] = keys.slice(0, n).map((k, i) => ({ k, c: cols[i % cols.length] }));
  const miss = Math.floor(Math.random() * n);
  const m = items[miss];
  const spare = keys.slice(n);
  const decoys: Obj[] = [
    { k: m.k, c: (m.c + 1 + Math.floor(Math.random() * 5)) % 6 },
    { k: spare[0] ?? keys[(n + 1) % keys.length], c: m.c },
    { k: spare[1] ?? keys[0], c: cols[(n + 1) % 6] },
  ].filter((d) => !same(d, m));
  return { items, miss, options: shuffled([m, ...decoys]) };
}

const Shape = ({ o, s }: { o: Obj; s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={COLORS[o.c]} stroke="rgba(38,61,55,.28)" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SHAPES[o.k] }} />
);

export function MemoryGame({ diff, env, onDone }: GameProps) {
  const { t } = useTranslation();
  const easy = diff === 'easy';
  // Normal mode grows by one object each round. Easy stays small.
  const plan = easy ? [4] : [4, 5, 6];
  const timers = useTimers(env.paused);
  const [idx, setIdx] = useState(0);
  const [round, setRound] = useState(() => makeRound(plan[0]));
  const [phase, setPhase] = useState<'show' | 'ask'>('show');
  const [left, setLeft] = useState(5);
  const [hint, setHint] = useState(false);
  const [bad, setBad] = useState<number[]>([]);
  const [ok, setOk] = useState<number | null>(null);
  const firstTry = useRef(0);
  const tries = useRef(0);
  const wrong = useRef(0);
  const answer = round.items[round.miss];
  const answerIdx = round.options.findIndex((o) => same(o, answer));

  useEffect(() => {
    env.round(idx + 1, plan.length, 'games.common.round');
    setPhase('show');
    setBad([]);
    setOk(null);
    setHint(false);
    setLeft(5);
    wrong.current = 0;
    env.say('curious', 'games.mem.focus');
    const id = timers.after(() => {
      setPhase('ask');
      env.say('listening', 'games.mem.ask');
    }, SHOW_MS);
    return () => timers.cancel(id);
    // Runs once per round. env.say and timers are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (phase !== 'show' || env.paused) return;
    const iv = setInterval(() => setLeft((v) => Math.max(1, v - 1)), 1000);
    return () => clearInterval(iv);
  }, [phase, env.paused]);

  function choose(i: number) {
    if (ok != null) return;
    if (i === answerIdx) {
      setOk(i);
      env.sfx('ok');
      if (!wrong.current && !hint) firstTry.current++;
      env.say('happy', wrong.current ? 'games.mem.rightAfterRetry' : 'games.mem.right');
      timers.after(() => {
        if (idx + 1 < plan.length) {
          setIdx(idx + 1);
          setRound(makeRound(plan[idx + 1]));
        } else {
          onDone({ acc: Math.round((firstTry.current / plan.length) * 100), retries: tries.current });
        }
      }, 1300);
      return;
    }
    wrong.current++;
    tries.current++;
    setBad((b) => [...b, i]);
    env.sfx('bad');
    env.say('encouraging', wrong.current > 1 ? () => tr('games.mem.wasThis', { object: describe(answer) }) : () => tr('games.mem.colorHint', { color: colorName(answer.c) }));
    if (wrong.current >= 3) choose(answerIdx);
  }

  return (
    <div className="scene mem">
      <h2 className="q__t">{t(phase === 'show' ? 'games.mem.memorize' : 'games.mem.whichMissing')}</h2>
      <div className={`tray tray--${round.items.length}`} role="img" aria-label={phase === 'show' ? t('games.mem.shown', { list: round.items.map(describe).join(t('common.listSep')) }) : t('games.mem.remaining', { list: round.items.filter((_, i) => i !== round.miss).map(describe).join(t('common.listSep')) })}>
        {round.items.map((x, i) => (
          <div key={x.k} className="tray__c" style={{ animationDelay: `${i * 60}ms` }}>
            {phase === 'ask' && i === round.miss ? <span className="tray__gap">{t('common.questionMark')}</span> : <Shape o={x} s={58} />}
          </div>
        ))}
      </div>
      {phase === 'show' ? (
        <div className="mem__count" role="timer" aria-live="off">
          <b>{left}</b>
          <div className="bar"><i key={idx} className="bar-drain" style={{ animationDuration: `${SHOW_MS}ms`, animationPlayState: env.paused ? 'paused' : 'running' }} /></div>
        </div>
      ) : (
        <>
          <div className="mem__opts">
            {round.options.map((o, i) => (
              <button key={`${o.k}${o.c}`} type="button" className={`opt opt--icon ${ok === i ? 'ok' : ''} ${bad.includes(i) ? 'no' : ''}`} disabled={ok != null || bad.includes(i)} aria-label={describe(o)} onClick={() => choose(i)}>
                <Shape o={o} s={46} />
              </button>
            ))}
          </div>
          <p className="hint" role="status">{hint ? t('games.mem.hint', { slot: round.miss + 1, color: colorName(answer.c) }) : ''}</p>
          <div className="row row--c"><HintButton used={hint} disabled={ok != null} onClick={() => setHint(true)} /></div>
        </>
      )}
    </div>
  );
}
