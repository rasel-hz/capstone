import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tr } from '../../../i18n';
import type { GameProps } from '../types';
import { useDrag } from './parts';

export type Bucket = 'act' | 'unsure' | 'later';
const BUCKETS: Bucket[] = ['act', 'unsure', 'later'];
// Examples, labelled as examples. Picking one only fills the box; nothing is assumed about the user.
const EXAMPLES = ['deadline', 'money', 'conversation', 'trip'];
const MAX = 5;

/**
 * "Let's think it through" (thought_sort). Everyday concerns, sorted into what the user can act on,
 * what's uncertain or out of their hands, and what to revisit later, then one small next step.
 * Reflection only: no score, nothing sent to the AI, and it isn't a treatment for anything.
 */
export function ThoughtSortGame({ diff, env, onDone }: GameProps) {
  const { t } = useTranslation();
  const max = diff === 'easy' ? 3 : MAX;
  const [phase, setPhase] = useState<'add' | 'sort' | 'step'>('add');
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [where, setWhere] = useState<Record<number, Bucket>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [next, setNext] = useState('');

  useEffect(() => {
    env.round(phase === 'add' ? 1 : phase === 'sort' ? 2 : 3, 3, 'games.common.step');
    env.say(phase === 'step' ? 'encouraging' : phase === 'sort' ? 'listening' : 'curious', `games.thought.say.${phase}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function add(v: string) {
    const c = v.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!c || items.length >= max || items.some((x) => x.toLowerCase() === c.toLowerCase())) return;
    setItems([...items, c]);
    setDraft('');
    env.sfx('tap');
  }
  function remove(i: number) {
    setItems(items.filter((_, j) => j !== i));
    setWhere({});
  }
  function place(i: number, b: Bucket | null) {
    setWhere((w) => {
      const n = { ...w };
      if (b) n[i] = b;
      else delete n[i];
      return n;
    });
    setPicked(null);
    env.sfx('tap');
  }
  const bind = useDrag((id, target) => place(Number(id), target === 'deck' ? null : (target as Bucket)));
  const inB = (b: Bucket) => items.map((x, i) => ({ x, i })).filter((o) => where[o.i] === b);
  const unplaced = items.map((x, i) => ({ x, i })).filter((o) => !where[o.i]);

  function finish(withStep = true) {
    const pick = (b: Bucket) => inB(b).map((o) => o.x);
    const step = withStep && focus != null && next.trim() ? { concern: items[focus], step: next.trim() } : null;
    const counts = { act: pick('act').length, unsure: pick('unsure').length, later: pick('later').length };
    env.sfx('ok');
    onDone({
      acc: null,
      retries: 0,
      mood: 'calm',
      say: 'games.thought.doneSay',
      note: step ? () => tr('games.thought.noteStep', { ...counts, step: step.step }) : () => tr('games.thought.note', counts),
      data: { concerns: items, act: pick('act'), unsure: pick('unsure'), later: pick('later'), next: step },
    });
  }

  if (phase === 'add') {
    return (
      <div className="scene pp">
        <div className="pp__head">
          <h2 className="q__t">{t('games.thought.addQ')}</h2>
        </div>
        <ul className="pp__list">
          {items.map((x, i) => (
            <li key={x} className="crd crd--in">
              <span className="grow" dir="auto">{x}</span>
              <button type="button" aria-label={t('games.common.remove', { item: x })} onClick={() => remove(i)}><X size={16} /></button>
            </li>
          ))}
        </ul>
        {items.length < max && (
          <form className="pb__add" onSubmit={(e) => { e.preventDefault(); add(draft); }}>
            <input dir="auto" aria-label={t('games.thought.addLabel')} maxLength={80} placeholder={t('games.thought.addPh')} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button type="submit" className="btn sm alt" aria-label={t('common.add')}><Plus size={16} aria-hidden="true" /></button>
          </form>
        )}
        {items.length < max && (
          <div className="tags" role="group" aria-label={t('games.common.examples')}>
            <span className="pp__tag pp__tag--ex">{t('games.common.examples')}</span>
            {EXAMPLES.map((k) => <button key={k} type="button" className="tag tag--btn" onClick={() => setDraft(t(`games.thought.examples.${k}`))}>{t(`games.thought.examples.${k}`)}</button>)}
          </div>
        )}
        <div className="row row--c"><button type="button" className="btn" disabled={!items.length} onClick={() => setPhase('sort')}>{t('common.next')}</button></div>
      </div>
    );
  }

  if (phase === 'sort') {
    return (
      <div className="scene pp">
        <div className="pp__head">
          <h2 className="q__t">{t('games.thought.sortQ')}</h2>
        </div>
        <div className="pb__deck" data-drop="deck">
          <div className="pb__cards">
            {unplaced.map(({ x, i }) => (
              <button key={x} type="button" dir="auto" className={`crd ${picked === i ? 'is-picked' : ''}`} aria-pressed={picked === i} {...bind(String(i))} onClick={() => setPicked(picked === i ? null : i)}>{x}</button>
            ))}
            {!unplaced.length && <span className="note">{t('games.plan.allPlaced')}</span>}
          </div>
        </div>
        <p className="hint" role="status">{picked != null ? t('games.plan.chooseCol', { item: items[picked] }) : t('games.plan.sortGuide')}</p>
        <div className="pb__cols">
          {BUCKETS.map((b) => (
            <section key={b} data-drop={b} className={`pb__col ts__col--${b}`} aria-label={t(`games.thought.buckets.${b}.title`)}>
              <button type="button" className="pb__head" disabled={picked == null} onClick={() => picked != null && place(picked, b)}>
                <b>{t(`games.thought.buckets.${b}.title`)}</b>
                <span className="note">{t(`games.thought.buckets.${b}.note`)}</span>
              </button>
              {inB(b).map(({ x, i }) => (
                <div key={x} className="crd crd--in" {...bind(String(i))}>
                  <span className="grow" dir="auto">{x}</span>
                  <button type="button" aria-label={t('games.common.putBack', { item: x })} onClick={() => place(i, null)}><X size={15} /></button>
                </div>
              ))}
            </section>
          ))}
        </div>
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => setPhase('add')}>{t('common.back')}</button>
          <button type="button" className="btn" disabled={unplaced.length > 0} onClick={() => { const a = inB('act'); setFocus(a.length ? a[0].i : null); setPhase('step'); }}>{t('common.next')}</button>
        </div>
      </div>
    );
  }

  // One small next step for something they can act on. With nothing to act on, a gentle note instead.
  const act = inB('act');
  return (
    <div className="scene pp">
      {act.length ? (
        <>
          <div className="pp__head">
            <h2 className="q__t">{t('games.thought.stepQ')}</h2>
          </div>
          {act.length > 1 && (
            <div className="tags tags--c" role="group" aria-label={t('games.thought.pickOne')}>
              {act.map(({ x, i }) => <button key={x} type="button" dir="auto" className={`tag tag--btn ${focus === i ? 'on' : ''}`} aria-pressed={focus === i} onClick={() => setFocus(i)}>{x}</button>)}
            </div>
          )}
          {focus != null && <p className="center" dir="auto"><b>{items[focus]}</b></p>}
          <input dir="auto" aria-label={t('games.thought.stepLabel')} maxLength={100} placeholder={t('games.thought.stepPh')} value={next} onChange={(e) => setNext(e.target.value)} />
          <div className="row row--c">
            <button type="button" className="btn alt" onClick={() => setPhase('sort')}>{t('common.back')}</button>
            <button type="button" className="btn" disabled={!next.trim()} onClick={() => finish()}>{t('games.thought.finish')}</button>
          </div>
          <div className="row row--c"><button type="button" className="btn-link" onClick={() => finish(false)}>{t('games.thought.skipStep')}</button></div>
        </>
      ) : (
        <>
          <div className="pp__head">
            <h2 className="q__t">{t('games.thought.noActQ')}</h2>
          </div>
          <div className="row row--c">
            <button type="button" className="btn alt" onClick={() => setPhase('sort')}>{t('common.back')}</button>
            <button type="button" className="btn" onClick={() => finish(false)}>{t('games.thought.finish')}</button>
          </div>
        </>
      )}
    </div>
  );
}
