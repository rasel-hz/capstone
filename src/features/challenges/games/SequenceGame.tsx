import { ArrowDown, ArrowUp, Backpack, BookOpen, Briefcase, CalendarCheck, Car, Coffee, Gift, Laptop, Shirt, Sunrise, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimers } from '../../../hooks/useTimers';
import { tr, type Msg } from '../../../i18n';
import { shuffled } from '../../../utils';
import type { GameProps } from '../types';
import { useDrag } from './parts';
import { PersonalPlanGame } from './PersonalPlanGame';

interface Step { id: string; i: LucideIcon }
interface SeqScene { id: string; s: Step[] }

// These are everyday examples, not the user's real events. The middle steps can go in any order,
// because several orders are reasonable. Only the first and last have a clear reason behind them.
// State holds step IDs, so the cards change language in place without moving.
const EVENT: SeqScene = { id: 'event', s: [{ id: 'confirm', i: CalendarCheck }, { id: 'gift', i: Gift }, { id: 'dress', i: Shirt }, { id: 'leave', i: Car }] };
const WORK: SeqScene = { id: 'work', s: [{ id: 'wake', i: Sunrise }, { id: 'schedule', i: CalendarCheck }, { id: 'breakfast', i: Coffee }, { id: 'leave', i: Briefcase }] };
const STUDY: SeqScene = { id: 'study', s: [{ id: 'timetable', i: BookOpen }, { id: 'laptop', i: Laptop }, { id: 'coffee', i: Coffee }, { id: 'leave', i: Backpack }] };

// With the user's own tasks from the chat, this is a personal planning board. Without them it is the
// original sequencing exercise, labelled as an example, so generic content is never passed off as theirs.
export function SequenceGame(props: GameProps) {
  return props.cfg ? <PersonalPlanGame {...props} cfg={props.cfg} /> : <ExampleSequence {...props} />;
}

function ExampleSequence({ diff, env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [scene] = useState(() => (env.hasEvent ? EVENT : env.sched === 'study' ? STUDY : WORK));
  const steps = diff === 'easy' ? [scene.s[0], scene.s[2], scene.s[3]] : scene.s;
  const correct = steps.map((x) => x.id);
  const icon = (id: string) => steps.find((x) => x.id === id)!.i;
  const label = (id: string) => tr(`games.seq.scenes.${scene.id}.steps.${id}`);
  const n = correct.length;
  const timers = useTimers(env.paused);
  const [pool, setPool] = useState(() => shuffled(correct));
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(n).fill(null));
  const [bad, setBad] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<Msg>('');

  const changed = () => { setBad([]); setFeedback(''); env.sfx('tap'); };

  function placeAt(c: string, i: number) {
    if (locked) return;
    const next = slots.map((v) => (v === c ? null : v));
    const from = slots.indexOf(c);
    const nextPool = pool.filter((x) => x !== c);
    const old = next[i];
    if (old) {
      if (from >= 0) next[from] = old;
      else nextPool.push(old);
    }
    next[i] = c;
    setSlots(next);
    setPool(nextPool);
    changed();
  }
  function placeNext(c: string) {
    const i = slots.indexOf(null);
    if (i >= 0) placeAt(c, i);
  }
  function takeBack(c: string) {
    if (locked) return;
    setSlots(slots.map((v) => (v === c ? null : v)));
    setPool([...pool, c]);
    changed();
  }
  function move(i: number, by: number) {
    const j = i + by;
    if (locked || j < 0 || j >= n) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    setSlots(next);
    changed();
  }

  const bind = useDrag((id, target) => {
    if (target === 'pool') {
      if (slots.includes(id)) takeBack(id);
    } else {
      placeAt(id, Number(target));
    }
  });

  // Only the first and last steps have a fixed place; the steps between them can go in any order.
  function check() {
    if (locked || pool.length) return;
    const wrong = [0, n - 1].filter((i) => slots[i] !== correct[i]);
    if (!wrong.length) {
      setLocked(true);
      env.sfx('ok');
      env.say('happy', 'games.seq.right');
      setFeedback('games.seq.rightNote');
      timers.after(() => onDone({ acc: tries ? Math.max(60, 100 - tries * 20) : 100, retries: tries }), 1500);
    } else if (!tries) {
      setTries(1);
      setBad(wrong);
      env.sfx('bad');
      setFeedback(wrong[0] === 0
        ? () => () => tr('games.seq.moveFirst', { step: label(correct[0]), why: tr(`games.seq.scenes.${scene.id}.whyFirst`) })
        : () => () => tr('games.seq.moveLast', { step: label(correct[n - 1]), why: tr('games.seq.whyLast') }));
      env.say('encouraging', 'games.seq.almost');
    } else {
      setLocked(true);
      setFeedback('games.seq.finalNote');
      env.say('encouraging', 'games.seq.finalSay');
      timers.after(() => onDone({ acc: Math.round(((n - wrong.length) / n) * 100), retries: tries }), 1600);
    }
  }

  const fb = typeof feedback === 'function' ? feedback() : feedback ? t(feedback) : '';
  return (
    <div className="scene seq">
      <div className="seq__head">
        <span className="pp__tag pp__tag--ex">{t('games.plan.example')}</span>
        <h2 className="q__t">{t(`games.seq.scenes.${scene.id}.title`)}</h2>
        <p className="note flush">{t(`games.seq.scenes.${scene.id}.note`)} {t('games.seq.guide')}</p>
      </div>
      <ol className="seq__slots">
        {slots.map((c, i) => {
          const Ic = c ? icon(c) : null;
          return (
            <li key={i} data-drop={String(i)} className={`slot ${bad.includes(i) ? 'bad' : ''} ${c ? 'has' : ''}`}>
              <b className="slot__n">{i + 1}</b>
              {c && Ic ? (
                <div className="crd crd--in" {...bind(c)}>
                  <Ic size={18} aria-hidden="true" />
                  <span className="grow">{label(c)}</span>
                  <button type="button" aria-label={t('games.common.moveUp', { item: label(c) })} disabled={i === 0 || locked} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
                  <button type="button" aria-label={t('games.common.moveDown', { item: label(c) })} disabled={i === n - 1 || locked} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
                  <button type="button" aria-label={t('games.common.putBack', { item: label(c) })} disabled={locked} onClick={() => takeBack(c)}><X size={16} /></button>
                </div>
              ) : <span className="slot__e">{t('games.seq.slot', { n: i + 1 })}</span>}
            </li>
          );
        })}
      </ol>
      <div className="seq__pool" data-drop="pool">
        {pool.map((c) => {
          const Ic = icon(c);
          return (
            <button key={c} type="button" className="crd" {...bind(c)} onClick={() => placeNext(c)}>
              <Ic size={18} aria-hidden="true" /> <span>{label(c)}</span>
            </button>
          );
        })}
        {!pool.length && <span className="note">{t('games.seq.allPlaced')}</span>}
      </div>
      <p className="hint" role="status">{fb}</p>
      <div className="row row--c"><button type="button" className="btn" disabled={pool.length > 0 || locked} onClick={check}>{t('games.seq.ready')}</button></div>
    </div>
  );
}
