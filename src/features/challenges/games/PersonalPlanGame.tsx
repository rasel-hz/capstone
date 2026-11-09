import { ArrowDown, ArrowUp, Clock, Lightbulb, Minus, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatList, iso, tr } from '../../../i18n';
import { MAX_TASKS, MAX_TASK_LEN, overTime, type PlanConfig, type PlanResult, type PlanTask } from '../../plan/config';
import type { GameProps } from '../types';
import { useDrag } from './parts';

type Col = 'now' | 'later' | 'notToday';
const COLS: Col[] = ['now', 'later', 'notToday'];
const TIME_CHOICES = [30, 45, 60, 90, 120];
const STEP = 5;

// The user's text is shown exactly as written. Suggestions are shown in the current language and labelled.
export const taskLabel = (t: PlanTask) => (t.src === 'user' ? t.text : tr(`games.plan.suggest.${t.key}`));

/**
 * Personal planning with the user's own tasks (modes A and B of the brief).
 * There are no wrong answers: priorities are the user's call. The only check is objective,
 * that time blocks fit the time the user said they have. It records what they chose, nothing more.
 */
export function PersonalPlanGame({ env, onDone, cfg }: GameProps & { cfg: PlanConfig }) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<PlanTask[]>(cfg.tasks);
  const userCount = tasks.filter((x) => x.src === 'user').length;
  const [phase, setPhase] = useState<'tasks' | 'sort' | 'time'>(userCount >= 2 ? 'sort' : 'tasks');
  const [draft, setDraft] = useState('');
  const [where, setWhere] = useState<Record<string, Col>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number | undefined>(cfg.minutes);
  const [noTime, setNoTime] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [mins, setMins] = useState<Record<string, number>>({});

  const steps = 3;
  const stepNo = phase === 'tasks' ? 1 : phase === 'sort' ? 2 : 3;
  useEffect(() => {
    env.round(stepNo, steps, 'games.common.step');
    env.say(phase === 'time' ? 'encouraging' : 'curious', `games.plan.say.${phase}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const byId = (id: string) => tasks.find((x) => x.id === id)!;
  const label = (id: string) => taskLabel(byId(id));
  const unplaced = tasks.filter((x) => !where[x.id]);
  const inCol = (c: Col) => tasks.filter((x) => where[x.id] === c);

  function addTask() {
    const text = draft.replace(/\s+/g, ' ').trim().slice(0, MAX_TASK_LEN);
    if (!text || userCount >= MAX_TASKS || tasks.some((x) => x.src === 'user' && x.text.toLowerCase() === text.toLowerCase())) return;
    const n = tasks.reduce((m, x) => Math.max(m, Number(x.id.slice(1)) || 0), 0) + 1;
    setTasks([...tasks.filter((x) => x.src === 'user'), { id: `u${n}`, text, src: 'user' }, ...tasks.filter((x) => x.src !== 'user')]);
    setDraft('');
    env.sfx('tap');
  }
  function removeTask(id: string) {
    setTasks(tasks.filter((x) => x.id !== id));
    setWhere(({ [id]: _, ...rest }) => rest);
    if (picked === id) setPicked(null);
  }
  function place(id: string, col: Col | null) {
    setWhere((w) => {
      const next = { ...w };
      if (col) next[id] = col;
      else delete next[id];
      return next;
    });
    setPicked(null);
    env.sfx('tap');
  }

  const bind = useDrag((id, target) => place(id, target === 'deck' ? null : (target as Col)));

  function toTime() {
    const now = inCol('now').map((x) => x.id);
    setOrder(now);
    setMins((m) => Object.fromEntries(now.map((id) => [id, m[id] ?? 0])));
    setPhase('time');
  }

  function finish(withTime: boolean) {
    const blocks = withTime ? order.map((id) => ({ id, mins: mins[id] ?? 0 })).filter((b) => b.mins > 0) : [];
    const result: PlanResult = {
      kind: 'personal',
      now: withTime ? order : inCol('now').map((x) => x.id),
      later: inCol('later').map((x) => x.id),
      notToday: inCol('notToday').map((x) => x.id),
      blocks,
      ...(withTime && minutes ? { minutes } : {}),
      tasks,
    };
    env.sfx('ok');
    onDone({ acc: null, retries: 0, say: 'games.plan.doneSay', note: () => planSummary(result), data: result });
  }

  // Step 1: the user's tasks. Only shown when the chat didn't already give at least two.
  if (phase === 'tasks') {
    return (
      <div className="scene pp">
        <div className="pp__head">
          <h2 className="q__t">{t('games.plan.tasksQ')}</h2>
        </div>
        <ul className="pp__list">
          {tasks.filter((x) => x.src === 'user').map((x) => (
            <li key={x.id} className="crd crd--in">
              <span className="grow" dir="auto">{x.text}</span>
              <button type="button" aria-label={t('games.common.remove', { item: x.text })} onClick={() => removeTask(x.id)}><X size={16} /></button>
            </li>
          ))}
        </ul>
        {userCount < MAX_TASKS && (
          <form className="pb__add" onSubmit={(e) => { e.preventDefault(); addTask(); }}>
            <input dir="auto" aria-label={t('games.plan.addLabel')} placeholder={t('games.plan.addPh')} maxLength={MAX_TASK_LEN} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button type="submit" className="btn sm alt" aria-label={t('common.add')}><Plus size={16} aria-hidden="true" /></button>
          </form>
        )}
        <div className="row row--c"><button type="button" className="btn" disabled={userCount < 2} onClick={() => setPhase('sort')}>{t('common.next')}</button></div>
        {userCount < 2 && <p className="note center">{t('games.plan.needTwo')}</p>}
      </div>
    );
  }

  // Step 2: now, later or not today. Every arrangement is valid.
  if (phase === 'sort') {
    const ready = !unplaced.length && inCol('now').length > 0;
    return (
      <div className="scene pp">
        <div className="pp__head">
          <h2 className="q__t">{t('games.plan.sortQ')}</h2>
        </div>
        <div className="pb__deck" data-drop="deck">
          <div className="pb__cards">
            {unplaced.map((x) => (
              <span key={x.id} className="pp__chip">
                <button type="button" dir="auto" className={`crd ${x.src === 'suggested' ? 'crd--sug' : ''} ${picked === x.id ? 'is-picked' : ''}`} aria-pressed={picked === x.id} {...bind(x.id)} onClick={() => setPicked(picked === x.id ? null : x.id)}>
                  {x.src === 'suggested' && <Lightbulb size={14} aria-hidden="true" />} {label(x.id)}
                  {x.src === 'suggested' && <em className="pp__tag">{t('games.plan.suggestion')}</em>}
                </button>
                {x.src === 'suggested' && <button type="button" className="pp__drop" aria-label={t('games.plan.skipSuggestion')} onClick={() => removeTask(x.id)}><X size={14} /></button>}
              </span>
            ))}
            {!unplaced.length && <span className="note">{t('games.plan.allPlaced')}</span>}
          </div>
        </div>
        <p className="hint" role="status">{picked ? t('games.plan.chooseCol', { item: label(picked) }) : t('games.plan.sortGuide')}</p>
        <div className="pb__cols">
          {COLS.map((col) => (
            <section key={col} data-drop={col} className={`pb__col pb__col--${col}`} aria-label={t(`games.plan.cols.${col}`)}>
              <button type="button" className="pb__head" disabled={!picked} onClick={() => picked && place(picked, col)}>
                <b>{t(`games.plan.cols.${col}`)}</b>
              </button>
              {inCol(col).map((x) => (
                <div key={x.id} className={`crd crd--in ${x.src === 'suggested' ? 'crd--sug' : ''}`} {...bind(x.id)}>
                  <span className="grow" dir="auto">{label(x.id)}</span>
                  <button type="button" aria-label={t('games.common.putBack', { item: label(x.id) })} onClick={() => place(x.id, null)}><X size={15} /></button>
                </div>
              ))}
            </section>
          ))}
        </div>
        <div className="row row--c">
          {cfg.tasks.filter((x) => x.src === 'user').length < 2 && <button type="button" className="btn alt" onClick={() => setPhase('tasks')}>{t('common.back')}</button>}
          <button type="button" className="btn" disabled={!ready} onClick={toTime}>{t('common.next')}</button>
        </div>
        {!unplaced.length && !inCol('now').length && <p className="note center">{t('games.plan.needNow')}</p>}
      </div>
    );
  }

  // Step 3: time blocks for "now", only if the user has or gives their available time.
  const blocks = order.map((id) => ({ id, mins: mins[id] ?? 0 }));
  const used = blocks.reduce((n, b) => n + b.mins, 0);
  const over = overTime(blocks, minutes);
  if (!minutes && !noTime) {
    return (
      <div className="scene pp">
        <div className="pp__head">
          <h2 className="q__t">{t('games.plan.timeQ')}</h2>
        </div>
        <div className="tags tags--c" role="group" aria-label={t('games.plan.timeQ')}>
          {TIME_CHOICES.map((m) => <button key={m} type="button" className="tag tag--btn" onClick={() => setMinutes(m)}>{t('common.minutes', { count: m })}</button>)}
        </div>
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => setPhase('sort')}>{t('common.back')}</button>
          <button type="button" className="btn" onClick={() => finish(false)}>{t('games.plan.prioritiesOnly')}</button>
        </div>
      </div>
    );
  }
  const move = (i: number, by: number) => {
    const n = [...order];
    [n[i], n[i + by]] = [n[i + by], n[i]];
    setOrder(n);
  };
  const bump = (id: string, by: number) => setMins((m) => ({ ...m, [id]: Math.max(0, Math.min(minutes ?? 480, (m[id] ?? 0) + by)) }));
  return (
    <div className="scene pp">
      <div className="pp__head">
        <h2 className="q__t">{t('games.plan.blocksQ', { n: minutes })}</h2>
      </div>
      <div className={`pp__meter ${over ? 'is-over' : ''}`} role="status">
        <Clock size={15} aria-hidden="true" />
        <span>{over ? t('games.plan.over', { n: over }) : t('games.plan.used', { used, total: minutes })}</span>
        <i style={{ width: `${Math.min(100, (used / (minutes || 1)) * 100)}%` }} />
      </div>
      <ol className="pp__blocks">
        {order.map((id, i) => (
          <li key={id} className="pp__block">
            <b className="slot__n">{i + 1}</b>
            <span className="grow" dir="auto">{label(id)}</span>
            <span className="pp__mins">
              <button type="button" aria-label={t('games.plan.less', { item: label(id) })} disabled={!mins[id]} onClick={() => bump(id, -STEP)}><Minus size={15} /></button>
              <output aria-live="polite">{t('common.minutes', { count: mins[id] ?? 0 })}</output>
              <button type="button" aria-label={t('games.plan.more', { item: label(id) })} onClick={() => bump(id, STEP)}><Plus size={15} /></button>
            </span>
            <span className="pp__move">
              <button type="button" aria-label={t('games.common.moveUp', { item: label(id) })} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
              <button type="button" aria-label={t('games.common.moveDown', { item: label(id) })} disabled={i === order.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
            </span>
          </li>
        ))}
      </ol>
      <div className="row row--c">
        <button type="button" className="btn alt" onClick={() => { setNoTime(false); if (!cfg.minutes) setMinutes(undefined); else setPhase('sort'); }}>{t('common.back')}</button>
        <button type="button" className="btn" disabled={over > 0 || used === 0} onClick={() => finish(true)}>{t('games.plan.finish')}</button>
      </div>
      <div className="row row--c"><button type="button" className="btn-link" onClick={() => finish(false)}>{t('games.plan.prioritiesOnly')}</button></div>
    </div>
  );
}

/** A factual summary of what the user chose. Used on the result screen and as the companion's follow-up. */
export function planSummary(r: PlanResult, lng?: string): string {
  const o = lng ? { lng } : {};
  const name = (id: string) => {
    const t = r.tasks.find((x) => x.id === id);
    return t ? iso(t.src === 'user' ? t.text : tr(`games.plan.suggest.${t.key}`, o)) : '';
  };
  const list = (ids: string[]) => formatList(ids.map(name).filter(Boolean), lng as 'en' | 'ar-SA' | undefined);
  const parts = [tr('games.plan.sum.now', { ...o, items: list(r.now) })];
  if (r.blocks.length) parts.push(tr('games.plan.sum.blocks', { ...o, items: formatList(r.blocks.map((b) => tr('games.plan.sum.block', { ...o, item: name(b.id), n: b.mins })), lng as 'en' | 'ar-SA' | undefined) }));
  if (r.later.length) parts.push(tr('games.plan.sum.later', { ...o, items: list(r.later) }));
  if (r.notToday.length) parts.push(tr('games.plan.sum.notToday', { ...o, items: list(r.notToday) }));
  return parts.join(' ');
}
