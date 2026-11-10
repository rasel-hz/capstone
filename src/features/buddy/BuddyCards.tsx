import { BellRing, Check, Plus, X } from 'lucide-react';
import { useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../../components/mascot/Mascot';
import ClickSpark, { type ClickSparkHandle } from '../../components/reactbits/ClickSpark';
import { useAppState, useStore } from '../../context/AppStateContext';
import { iso } from '../../i18n';
import { addGoals, GOAL_LEN, MAX_GOALS, removeGoal, todayGoals, toggleGoal } from './buddy';
import { doneLater, dueLater, laterTime } from '../later/later';
import { useMinute } from '../prayer/PrayerCity';

/** A warm hello after a long gap. Nothing was lost, and it says so. */
export function MissedYou() {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  if (!s.missed) return null;
  return (
    <section className="missed" aria-labelledby="missed-t">
      <Mascot state="happy" size={64} />
      <div className="grow">
        <h2 id="missed-t">{s.name ? t('buddy.missed.title', { name: iso(s.name) }) : t('buddy.missed.titleNoName')}</h2>
        <p className="note flush">{t('buddy.missed.text')}</p>
      </div>
      <button type="button" className="btn sm" onClick={() => store.update((d) => { d.missed = 0; })}>{t('buddy.missed.ok')}</button>
    </section>
  );
}

// What the user set aside in "Let's think it through", once its time comes. Done, or again tomorrow.
export function LaterCards() {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  useMinute();
  const due = dueLater(s);
  if (!due.length) return null;
  return (
    <>
      {due.map((x) => (
        <section key={x.id} className="missed later-card" aria-label={t('buddy.later.label')}>
          <BellRing size={22} aria-hidden="true" />
          <div className="grow">
            <h2>{t('buddy.later.title')}</h2>
            <p className="flush" dir="auto">{x.text}</p>
          </div>
          <button type="button" className="btn sm" onClick={() => store.update((d) => doneLater(d, x.id))}>{t('buddy.later.done')}</button>
          <button type="button" className="btn sm alt" onClick={() => store.update((d) => { const it = d.later.find((y) => y.id === x.id); if (it) it.at = laterTime('tomorrow'); })}>{t('buddy.later.tomorrow')}</button>
        </section>
      ))}
    </>
  );
}

// Today's goals in the user's words. Each one done adds to the buddy's energy, shown by its glow on Home.
export function GoalsCard() {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const [text, setText] = useState('');
  const goals = todayGoals(s);
  const full = goals.length >= MAX_GOALS;
  const spark = useRef<ClickSparkHandle>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // A small burst from the tick box when a goal is done. Unticking stays quiet.
  function tick(e: MouseEvent<HTMLButtonElement>, id: string, wasDone: boolean) {
    store.update((d) => { toggleGoal(d, id); });
    const box = e.currentTarget.querySelector('.goal__box')?.getBoundingClientRect();
    const root = listRef.current?.parentElement?.getBoundingClientRect();
    if (!wasDone && box && root) spark.current?.spark(box.left - root.left + box.width / 2, box.top - root.top + box.height / 2);
  }

  function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    store.update((d) => { addGoals(d, [text]); });
    setText('');
  }

  return (
    <section className="goals" aria-labelledby="goals-t">
      <div className="goals__head">
        <div className="grow">
          <h2 id="goals-t">{t('buddy.goals.title')}</h2>
        </div>
        {goals.length > 0 && <GoalRing done={goals.filter((g) => g.done).length} total={goals.length} />}
      </div>
      {goals.length ? (
        <ClickSpark ref={spark} auto={false} disabled={!!s.rm} sparkColor={['#28785B', '#FFD36E']} sparkSize={8} sparkRadius={20} sparkCount={8} duration={420} style={{ height: 'auto' }}>
        <ul className="goals__list" ref={listRef}>
          {goals.map((g) => (
            <li key={g.id} className={g.done ? 'is-done' : ''}>
              <button type="button" className="goal__tick" role="checkbox" aria-checked={!!g.done} onClick={(e) => tick(e, g.id, !!g.done)}>
                <span className="goal__box" aria-hidden="true">{g.done ? <Check size={14} /> : null}</span>
                <span className="goal__t" dir="auto">{g.text}</span>
              </button>
              <button type="button" className="goal__x" aria-label={t('buddy.goals.remove', { text: g.text })} onClick={() => store.update((d) => removeGoal(d, g.id))}><X size={15} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
        </ClickSpark>
      ) : null}
      {full ? <p className="note flush">{t('buddy.goals.full', { n: MAX_GOALS })}</p> : (
        <form className="goals__add" onSubmit={add}>
          <input type="text" dir="auto" value={text} maxLength={GOAL_LEN} placeholder={t('buddy.goals.placeholder')} aria-label={t('buddy.goals.addLabel')} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn sm" disabled={!text.trim()}><Plus size={15} aria-hidden="true" /> {t('buddy.goals.add')}</button>
        </form>
      )}
    </section>
  );
}

// How many of today's goals are ticked, drawn as a ring. The numbers are also given as text.
function GoalRing({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation();
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="goal-ring" role="img" aria-label={t('buddy.goals.ringLabel', { done, total })}>
      <svg viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="27" cy="27" r={r} className="goal-ring__track" />
        <circle cx="27" cy="27" r={r} className="goal-ring__fill" strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} />
      </svg>
      <b aria-hidden="true">{done}/{total}</b>
    </span>
  );
}
