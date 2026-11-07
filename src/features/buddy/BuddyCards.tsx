import { Check, Coffee, Heart, Plus, X, Zap } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../../components/mascot/Mascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { iso } from '../../i18n';
import { useMissions } from '../mission/MissionProvider';
import { addGoals, ENERGY_FULL, energyToday, GOAL_LEN, MAX_GOALS, removeGoal, todayGoals, toggleGoal } from './buddy';

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

// Today's goals in the user's words, and the buddy's energy that they fill.
export function GoalsCard() {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const [text, setText] = useState('');
  const goals = todayGoals(s);
  const full = goals.length >= MAX_GOALS;

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
          <p className="note flush">{t('buddy.goals.sub')}</p>
        </div>
      </div>
      {goals.length ? (
        <ul className="goals__list">
          {goals.map((g) => (
            <li key={g.id} className={g.done ? 'is-done' : ''}>
              <button type="button" className="goal__tick" role="checkbox" aria-checked={!!g.done} onClick={() => store.update((d) => { toggleGoal(d, g.id); })}>
                <span className="goal__box" aria-hidden="true">{g.done ? <Check size={14} /> : null}</span>
                <span className="goal__t" dir="auto">{g.text}</span>
              </button>
              <button type="button" className="goal__x" aria-label={t('buddy.goals.remove', { text: g.text })} onClick={() => store.update((d) => removeGoal(d, g.id))}><X size={15} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="note">{t('buddy.goals.empty')}</p>}
      {full ? <p className="note flush">{t('buddy.goals.full', { n: MAX_GOALS })}</p> : (
        <form className="goals__add" onSubmit={add}>
          <input type="text" dir="auto" value={text} maxLength={GOAL_LEN} placeholder={t('buddy.goals.placeholder')} aria-label={t('buddy.goals.addLabel')} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn sm" disabled={!text.trim()}><Plus size={15} aria-hidden="true" /> {t('buddy.goals.add')}</button>
        </form>
      )}
      {!goals.length && <p className="note flush">{t('buddy.goals.fromChat')}</p>}
      <BuddyEnergy />
    </section>
  );
}

function BuddyEnergy() {
  const { t } = useTranslation();
  const s = useAppState();
  const missions = useMissions();
  const n = energyToday(s);
  return (
    <div className={`nrg ${n >= ENERGY_FULL ? 'is-full' : ''}`}>
      <div className="nrg__top">
        <span className="nrg__l"><Zap size={15} aria-hidden="true" /> {t('buddy.energy.label')}</span>
        <span className="note">{t('buddy.energy.of', { n, total: ENERGY_FULL })}</span>
      </div>
      <div className="nrg__bar" role="meter" aria-valuemin={0} aria-valuemax={ENERGY_FULL} aria-valuenow={n} aria-label={t('buddy.energy.label')}>
        {Array.from({ length: ENERGY_FULL }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
      </div>
      {n >= ENERGY_FULL && (
        // A full day ends with permission to stop, not a push for more.
        <div className="nrg__done">
          <p className="nrg__full"><Heart size={15} aria-hidden="true" /> {t('buddy.energy.full')}</p>
          <p className="note flush">{t('buddy.energy.restNote')}</p>
          <button type="button" className="btn sm alt" onClick={() => missions.start([{ id: 'calm_landscape', why: [{ k: 'break' }], diff: 'normal' }])}><Coffee size={15} aria-hidden="true" /> {t('buddy.energy.rest')}</button>
        </div>
      )}
    </div>
  );
}
