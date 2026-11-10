import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../context/AppStateContext';
import { tr } from '../../../i18n';
import type { GameResult } from '../../../types';
import { addGoals } from '../../buddy/buddy';
import type { CrisisLevel } from '../../companion/crisis';
import { addLater, atClock, laterTime } from '../../later/later';
import type { GameProps } from '../types';
import { CrisisStop, crisisIn, useDrag } from './parts';

export type Bucket = 'act' | 'unsure' | 'later';
const BUCKETS: Bucket[] = ['act', 'unsure', 'later'];
// Examples, labelled as examples. Picking one only fills the box; nothing is assumed about the user.
const EXAMPLES = ['deadline', 'money', 'conversation', 'trip'];
const MAX = 5;
const WHEN = ['hour', 'tonight', 'tomorrow'] as const;
type Phase = 'add' | 'sort' | 'later' | 'unsure' | 'step';
const ROUND: Record<Phase, number> = { add: 1, sort: 2, later: 3, unsure: 3, step: 3 };

/**
 * "Let's think it through" (thought_sort). Everyday concerns, sorted into what the user can act on,
 * what's uncertain or out of their hands, and what to revisit later, then one small next step.
 * "Later" gets a time and a reminder on Home; "not clear" gets one question. The small step can go into today's
 * goals, start now with "Just the first step", or be planned with "Break it down".
 * Reflection only: no score, nothing sent to the AI, and it isn't a treatment for anything.
 */
export function ThoughtSortGame({ diff, env, onDone }: GameProps) {
  const { t } = useTranslation();
  const store = useStore();
  const max = diff === 'easy' ? 3 : MAX;
  const [phase, setPhase] = useState<Phase>('add');
  const [crisis, setCrisis] = useState<CrisisLevel>(0);
  const [laterAt, setLaterAt] = useState<number | null>(null);
  const [clockText, setClockText] = useState('');
  const [missing, setMissing] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [where, setWhere] = useState<Record<number, Bucket>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [next, setNext] = useState('');

  useEffect(() => {
    env.round(ROUND[phase], 3, 'games.common.step');
    env.say(phase === 'step' ? 'encouraging' : phase === 'sort' ? 'listening' : 'curious', `games.thought.say.${phase}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function add(v: string) {
    const c = v.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!c || items.length >= max || items.some((x) => x.toLowerCase() === c.toLowerCase())) return;
    const lv = crisisIn(c);
    if (lv) return setCrisis(lv);
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

  // After sorting: a time for "later", then the question for "not clear", then the small step.
  function after(from: Phase) {
    const order: Phase[] = ['later', 'unsure', 'step'];
    const has = { later: inB('later').length > 0, unsure: inB('unsure').length > 0, step: true } as Record<string, boolean>;
    const nextPhase = order.slice(order.indexOf(from) + 1).find((p) => has[p]) ?? 'step';
    if (nextPhase === 'step') {
      const a = inB('act');
      setFocus(a.length ? a[0].i : null);
    }
    setPhase(nextPhase);
  }

  type Go = 'goals' | 'now' | 'plan' | null;
  function finish(withStep = true, go: Go = null) {
    const pick = (b: Bucket) => inB(b).map((o) => o.x);
    const step = withStep && focus != null && next.trim() ? { concern: items[focus], step: next.trim() } : null;
    if (step) {
      const lv = crisisIn(step.step);
      if (lv) return setCrisis(lv);
    }
    const counts = { act: pick('act').length, unsure: pick('unsure').length, later: pick('later').length };
    const later = pick('later');
    store.update((d) => {
      if (laterAt && later.length) addLater(d, later, laterAt);
      if (step && go === 'goals') addGoals(d, [step.step]);
    });
    env.sfx('ok');
    const then: GameResult['then'] = step && go === 'now' ? { id: 'micro_start', seed: { task: step.concern, step: step.step, from: 'thought_sort' } }
      : step && go === 'plan' ? { id: 'breakdown', seed: { task: step.step, from: 'thought_sort' } } : undefined;
    onDone({
      ...(then ? { then } : {}),
      acc: null,
      retries: 0,
      mood: 'calm',
      say: 'games.thought.doneSay',
      note: step ? () => tr('games.thought.noteStep', { ...counts, step: step.step }) : () => tr('games.thought.note', counts),
      data: { concerns: items, act: pick('act'), unsure: pick('unsure'), later, laterAt, missing: missing.trim() || null, next: step, go },
    });
  }

  if (crisis) return <CrisisStop level={crisis} onBack={() => setCrisis(0)} />;

  // When to come back to what was set aside. The reminder shows on Home at that time.
  if (phase === 'later') {
    const typed = atClock(clockText);
    return (
      <div className="scene pp">
        <div className="pp__head"><h2 className="q__t">{t('games.thought.laterQ')}</h2></div>
        <ul className="pp__list">{inB('later').map(({ x }) => <li key={x} className="crd crd--in"><span className="grow" dir="auto">{x}</span></li>)}</ul>
        <div className="tags tags--c" role="group" aria-label={t('games.thought.laterQ')}>
          {WHEN.map((w) => {
            const at = laterTime(w);
            return <button key={w} type="button" className={`tag tag--btn ${laterAt === at && !clockText ? 'on' : ''}`} aria-pressed={laterAt === at && !clockText} onClick={() => { setClockText(''); setLaterAt(at); }}>{t(`games.thought.when.${w}`)}</button>;
          })}
        </div>
        <label className="note center" htmlFor="ts-at">{t('games.thought.orTime')}</label>
        <input id="ts-at" type="time" value={clockText} onChange={(e) => { setClockText(e.target.value); setLaterAt(atClock(e.target.value)); }} />
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => { setLaterAt(null); after('later'); }}>{t('games.thought.noReminder')}</button>
          <button type="button" className="btn" disabled={!laterAt && !typed} onClick={() => after('later')}>{t('common.next')}</button>
        </div>
      </div>
    );
  }

  // One question for what isn't clear, and nothing more.
  if (phase === 'unsure') {
    return (
      <div className="scene pp">
        <div className="pp__head"><h2 className="q__t">{t('games.thought.unsureQ')}</h2></div>
        <ul className="pp__list">{inB('unsure').map(({ x }) => <li key={x} className="crd crd--in"><span className="grow" dir="auto">{x}</span></li>)}</ul>
        <input dir="auto" aria-label={t('games.thought.unsureLabel')} maxLength={100} placeholder={t('games.thought.unsurePh')} value={missing} onChange={(e) => setMissing(e.target.value)} />
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => { setMissing(''); after('unsure'); }}>{t('games.thought.unsureNo')}</button>
          <button type="button" className="btn" disabled={!missing.trim()} onClick={() => { const lv = crisisIn(missing); if (lv) setCrisis(lv); else after('unsure'); }}>{t('common.next')}</button>
        </div>
      </div>
    );
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
          <button type="button" className="btn" disabled={unplaced.length > 0} onClick={() => after('sort')}>{t('common.next')}</button>
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
          <div className="choices choices--3">
            {(['goals', 'now', 'plan'] as const).map((g) => <button key={g} type="button" className="opt" disabled={!next.trim()} onClick={() => finish(true, g)}>{t(`games.thought.go.${g}`)}</button>)}
          </div>
          <div className="row row--c">
            <button type="button" className="btn alt" onClick={() => setPhase('sort')}>{t('common.back')}</button>
            <button type="button" className="btn-link" onClick={() => finish(false)}>{t('games.thought.skipStep')}</button>
          </div>
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
