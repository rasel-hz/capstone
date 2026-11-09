import { Check, ExternalLink, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameProps } from '../challenges/types';
import { DHIKR_SOURCES, dhikrItems, stepsOf, type DhikrId, type DhikrItem } from './content';

/** What is saved with the attempt: how far each dhikr got. No text the user typed, and nothing private. */
export interface DhikrProgress {
  key: string;
  counts: number[];
  done: boolean;
}

/** One tap. A fixed target stops at its number; a free count keeps going. */
export function tap(counts: number[], step: number, target: number | null): number[] {
  if (target != null && counts[step] >= target) return counts;
  return counts.map((c, i) => (i === step ? c + 1 : c));
}
/** An item is done when every counted step reached its number, or a free count was said at least once. */
export const itemDone = (item: DhikrItem, counts: number[]) =>
  stepsOf(item).every((s, i) => (s.target == null ? counts[i] >= 1 : counts[i] >= s.target));
/** Finishing needs at least one dhikr actually said. Opening the challenge alone never completes it. */
export const canFinish = (progress: DhikrProgress[]) => progress.some((p) => p.done);

const ar = { lang: 'ar', dir: 'rtl' } as const;

function Words({ item, step }: { item: DhikrItem; step: number }) {
  const { t } = useTranslation();
  if (item.kind === 'quran') {
    return (
      <div className="dk-quran">
        {item.parts!.map((p) => (
          <div key={`${p.surah}:${p.ayat[0].n}`} className="dk-quran__part">
            {p.basmala && <p className="dk-quran__basmala" {...ar}>{p.basmala}</p>}
            <p className="dk-words" {...ar}>
              {p.ayat.map((a) => <span key={a.n}>{a.text} <span className="dk-ayah" aria-hidden="true">{t('games.dhikr.ayah', { n: a.n.toLocaleString('ar-SA') })}</span> </span>)}
            </p>
          </div>
        ))}
      </div>
    );
  }
  if (item.kind === 'steps') {
    return (
      <ol className="dk-steps" {...ar}>
        {item.steps!.map((s, i) => <li key={s.text} className={i === step ? 'is-now' : i < step ? 'is-done' : ''}><span className="dk-words">{s.text}</span></li>)}
      </ol>
    );
  }
  return <p className="dk-words" {...ar}>{item.text}</p>;
}

function Reference({ item }: { item: DhikrItem }) {
  const { t } = useTranslation();
  return (
    <p className="dk-ref">
      {item.quran && <span {...ar}>{item.quran.join(t('common.listSep'))} · </span>}
      <a href={item.ref.url} target="_blank" rel="noopener noreferrer" {...ar}>{item.ref.text} <ExternalLink size={12} aria-hidden="true" /></a>
      {item.kind === 'quran' && <span className="note"> · {t('games.dhikr.quranSource', { name: DHIKR_SOURCES.quran.name })}</span>}
    </p>
  );
}

export function Counter({ count, target, onTap, onReset, label, still }: { count: number; target: number | null; onTap(): void; onReset(): void; label: string; still: boolean }) {
  const { t } = useTranslation();
  const done = target != null && count >= target;
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = target ? Math.min(1, count / target) : 0;
  return (
    <div className="dk-count">
      <button
        type="button"
        // The key restarts the small pulse on each tap. With reduced motion there is no pulse.
        key={still ? 'still' : count}
        className={`dk-count__b ${done ? 'is-done' : ''} ${still || count === 0 ? '' : 'is-pulse'}`}
        onClick={onTap}
        disabled={done}
        aria-label={target ? t('games.dhikr.countOf', { label, n: count, total: target }) : t('games.dhikr.countFree', { label, n: count })}
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={r} fill="none" className="dk-count__track" strokeWidth="7" />
          {target != null && <circle className="dk-count__v" cx="60" cy="60" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 60 60)" />}
        </svg>
        <span className="dk-count__n" aria-hidden="true">{done ? <Check size={30} /> : count}</span>
        {target != null && !done && <span className="dk-count__of" aria-hidden="true">{t('games.dhikr.of', { total: target })}</span>}
      </button>
      <p className="sr-only" role="status">{done ? t('games.dhikr.reached') : ''}</p>
      {count > 0 && !done && <button type="button" className="btn-link dk-count__reset" onClick={onReset}><RotateCcw size={14} aria-hidden="true" /> {t('games.dhikr.reset')}</button>}
    </div>
  );
}

/** One of the five dhikr challenges: verified text, its reference, a counter, and gentle progress. */
export function DhikrGame({ id, env, onDone }: GameProps & { id: DhikrId }) {
  const { t } = useTranslation();
  const list = useMemo(() => dhikrItems(id), [id]);
  const night = id === 'dhikr_sleep';
  const [i, setI] = useState(0);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState<DhikrProgress[]>(() => list.map(({ key, item }) => ({ key, counts: stepsOf(item).map(() => 0), done: false })));
  const sent = useRef(false);
  const { key, item } = list[i];
  const steps = stepsOf(item);
  const counts = progress[i].counts;
  const target = steps[step].target;
  const stepDone = target == null ? counts[step] >= 1 : counts[step] >= target;
  const last = i === list.length - 1;
  const doneCount = progress.filter((p) => p.done).length;

  useEffect(() => {
    env.say('calm', `games.dhikr.intro.${id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { env.round(i + 1, list.length, 'games.dhikr.round'); }, [i, list.length, env]);

  const update = (next: number[]) => setProgress((p) => p.map((x, k) => (k === i ? { ...x, counts: next, done: itemDone(item, next) } : x)));

  function onTap() {
    const next = tap(counts, step, target);
    update(next);
    // A fixed count reached moves to the next phrase of the same dhikr by itself.
    if (target != null && next[step] >= target && step < steps.length - 1) setStep(step + 1);
  }

  function finish(all: DhikrProgress[]) {
    if (sent.current || !canFinish(all)) return;
    sent.current = true;
    const n = all.filter((p) => p.done).length;
    onDone({ acc: null, retries: 0, mood: 'calm', say: night ? 'games.dhikr.doneNight' : 'games.dhikr.done', data: { dhikr: all, said: n, of: all.length } });
  }

  function next() {
    if (last) return finish(progress);
    setI(i + 1);
    setStep(0);
  }

  return (
    <div className={`scene dk ${night ? 'dk--night' : ''}`}>
      <div className="dk-bar" aria-hidden="true"><span style={{ width: `${(doneCount / list.length) * 100}%` }} /></div>
      <p className="note center" role="status">{t('games.dhikr.progress', { n: doneCount, total: list.length })}</p>

      <figure className="dk-card" key={key}>
        <Words item={item} step={step} />
        <Reference item={item} />
      </figure>

      <Counter
        label={t('games.dhikr.thisOne')}
        count={counts[step]}
        target={target}
        still={env.rm || night}
        onTap={onTap}
        onReset={() => update(counts.map((c, k) => (k === step ? 0 : c)))}
      />
      {target == null && <p className="note center">{t('games.dhikr.free')}</p>}

      <div className="row row--c">
        {!progress[i].done && <button type="button" className="btn-link" onClick={next}>{t(last ? 'games.dhikr.skipLast' : 'games.dhikr.skip')}</button>}
        {(stepDone || progress[i].done) && (
          <button type="button" className="btn" onClick={next} disabled={last && !canFinish(progress)}>{t(last ? 'games.dhikr.finish' : 'games.dhikr.next')}</button>
        )}
      </div>
      {last && !canFinish(progress) && <p className="note center">{t('games.dhikr.needOne')}</p>}
    </div>
  );
}
