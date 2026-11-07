import { ArrowDown, ArrowUp, Lock, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tr } from '../../../i18n';
import type { GameProps } from '../types';

const SEEDS: Record<string, string[]> = { exam: ['a', 'b', 'c', 'd'], talk: ['a', 'b', 'c', 'd'], room: ['a', 'b', 'c', 'd'], paperwork: ['a', 'b', 'c', 'd'] };
const WHEN = ['prayer', 'coffee', 'home', 'lunch'];

// "seed:..." values stay in the current language. Anything typed stays exactly as typed.
function label(v: string) {
  if (!v.startsWith('seed:')) return v;
  const [area, id, step] = v.slice(5).split('/');
  if (area === 'when') return tr(`games.breakdown.when.${id}`);
  return step ? tr(`games.breakdown.seeds.${id}.steps.${step}`) : tr(`games.breakdown.seeds.${id}.task`);
}

export function BreakdownGame({ diff, env, onDone }: GameProps) {
  const { t } = useTranslation();
  const max = diff === 'easy' ? 1 : 5;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [task, setTask] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [when, setWhen] = useState('');
  const seedId = task.startsWith('seed:') ? task.slice(5).split('/')[1] : null;
  const seeds = seedId ? SEEDS[seedId].map((x) => `seed:task/${seedId}/${x}`) : [];

  useEffect(() => {
    env.round(step, 3, 'games.common.step');
    env.say(step === 3 ? 'encouraging' : 'curious', `games.breakdown.say${step}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function add(v: string) {
    const c = v.trim();
    if (!c || steps.includes(c) || steps.length >= max) return;
    setSteps([...steps, c]);
    setDraft('');
    env.sfx('tap');
  }
  function move(i: number, by: number) {
    const n = [...steps];
    [n[i], n[i + by]] = [n[i + by], n[i]];
    setSteps(n);
  }

  if (step === 1) {
    return (
      <div className="scene form">
        <label htmlFor="bd-task"><h2 className="q__t">{t('games.breakdown.taskQ')}</h2></label>
        <input id="bd-task" dir="auto" maxLength={100} placeholder={t('games.breakdown.taskPh')} value={label(task)} onChange={(e) => setTask(e.target.value)} />
        <div className="tags" role="group" aria-label={t('games.common.examples')}>
          {Object.keys(SEEDS).map((x) => <button key={x} type="button" className="tag tag--btn" onClick={() => setTask(`seed:task/${x}`)}>{t(`games.breakdown.seeds.${x}.task`)}</button>)}
        </div>
        <p className="note"><Lock size={13} aria-hidden="true" /> {t('games.common.staysOnDevice')}</p>
        <div className="row row--c"><button type="button" className="btn" disabled={!task.trim()} onClick={() => setStep(2)}>{t('common.next')}</button></div>
      </div>
    );
  }

  if (step === 2) {
    const unused = seeds.filter((x) => !steps.includes(x));
    return (
      <div className="scene form">
        <h2 className="q__t">{t('games.breakdown.title')} <bdi>{label(task).trim()}</bdi></h2>
        <ol className="bd__list">
          {steps.map((x, i) => (
            <li key={x} className="crd crd--in">
              <b className="slot__n">{i + 1}</b>
              <span className="grow" dir="auto">{label(x)}</span>
              <button type="button" aria-label={t('games.common.moveUp', { item: label(x) })} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
              <button type="button" aria-label={t('games.common.moveDown', { item: label(x) })} disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
              <button type="button" aria-label={t('games.common.remove', { item: label(x) })} onClick={() => setSteps(steps.filter((y) => y !== x))}><X size={16} /></button>
            </li>
          ))}
        </ol>
        {!steps.length && <p className="note center">{t('games.breakdown.noSteps')}</p>}
        {steps.length < max ? (
          <>
            <form className="pb__add" onSubmit={(e) => { e.preventDefault(); add(draft); }}>
              <input dir="auto" aria-label={t('games.breakdown.newStep')} maxLength={80} placeholder={t('games.breakdown.stepPh')} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button type="submit" className="btn sm alt" aria-label={t('games.breakdown.addStep')}><Plus size={16} aria-hidden="true" /></button>
            </form>
            {unused.length > 0 && (
              <div className="tags" role="group" aria-label={t('games.common.examples')}>
                {unused.map((x) => <button key={x} type="button" className="tag tag--btn" onClick={() => add(x)}><Plus size={13} aria-hidden="true" /> {label(x)}</button>)}
              </div>
            )}
          </>
        ) : <p className="note center">{t(max === 1 ? 'games.breakdown.oneEnough' : 'games.breakdown.fiveEnough')}</p>}
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => setStep(1)}>{t('common.back')}</button>
          <button type="button" className="btn" disabled={!steps.length} onClick={() => setStep(3)}>{t('common.next')}</button>
        </div>
      </div>
    );
  }

  const whenText = label(when).trim();
  return (
    <div className="scene form">
      <h2 className="q__t">{t('games.breakdown.planTitle')}</h2>
      <p className="plan">{t('games.breakdown.planLine', { when: whenText || '...', step: label(steps[0]) })}</p>
      <div className="tags" role="group" aria-label={t('games.breakdown.whenLabel')}>
        {WHEN.map((x) => {
          const v = `seed:when/${x}`;
          return <button key={x} type="button" className={`tag tag--btn ${when === v ? 'on' : ''}`} aria-pressed={when === v} onClick={() => setWhen(v)}>{label(v)}</button>;
        })}
      </div>
      <label htmlFor="bd-when" className="note">{t('games.breakdown.orType')}</label>
      <input id="bd-when" dir="auto" maxLength={40} placeholder={t('games.breakdown.whenPh')} value={whenText} onChange={(e) => setWhen(e.target.value)} />
      <div className="row row--c">
        <button type="button" className="btn alt" onClick={() => setStep(2)}>{t('common.back')}</button>
        <button
          type="button"
          className="btn"
          disabled={!whenText}
          onClick={() => {
            env.sfx('ok');
            const first = steps[0];
            const w = when;
            onDone({
              acc: null,
              retries: 0,
              say: 'games.breakdown.done',
              note: () => tr('games.breakdown.note', { when: label(w).trim(), step: label(first) }),
              data: { task: label(task).trim(), steps: steps.map(label), plan: { when: whenText, firstStep: label(first) } },
            });
          }}
        >{t('games.breakdown.finish')}</button>
      </div>
    </div>
  );
}
