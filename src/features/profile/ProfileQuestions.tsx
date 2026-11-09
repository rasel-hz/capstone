import {
  ArrowRight, BedDouble, BookOpen, Briefcase, Check, Coffee, Dumbbell, GraduationCap, HelpCircle, ListChecks,
  MessageCircle, Moon, Plus, Rocket, School, Shuffle, Sparkles, Target, Users, Wind, X, Zap, type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_TASKS, MAX_TASK_LEN } from '../plan/config';
import {
  emptyProfile, EXCLUSIVE, groupOf, isMulti, optionsFor, questionsFor, suggestWhen, type GoalId, type LifeProfile, type QuestionId,
} from './questions';

const ICONS: Record<string, LucideIcon> = {
  school: School, uni: GraduationCap, work: Briefcase, both: BookOpen, flex: Shuffle, other: HelpCircle, skip: X,
  organize: ListChecks, focus: Target, start: Rocket, stress: Wind, sleep: Moon, social: Users, habits: Dumbbell,
  after_class: School, after_work: Briefcase, bedtime: BedDouble, free: Coffee, suggest: Sparkles,
  games: Zap, steps: ListChecks, talk: MessageCircle, calm: Wind, auto: Sparkles, unsure: HelpCircle,
};

/**
 * The adaptive questions, used by onboarding and when an existing user sets up or updates their journey.
 * State holds stable IDs and the user's own words, so a language switch keeps every answer.
 */
export function ProfileQuestions({ initial, busy, onBack, onDone, onGroup }: {
  initial?: LifeProfile | null;
  busy?: boolean;
  onBack?(): void;
  onDone(p: LifeProfile): void;
  onGroup?(g: number): void;
}) {
  const { t } = useTranslation();
  const [p, setP] = useState<LifeProfile>(() => initial ?? emptyProfile());
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState('');
  const [keep, setKeep] = useState(false);
  const list = useMemo(() => questionsFor(p), [p]);
  const q: QuestionId = list[Math.min(i, list.length - 1)];
  const last = i >= list.length - 1;

  useEffect(() => { onGroup?.(groupOf(q)); }, [q, onGroup]);

  const chosen = (): string[] => {
    switch (q) {
      case 'life': return p.life;
      case 'goals': return p.goals;
      case 'primary': return p.primary ? [p.primary] : [];
      case 'when': return p.when;
      case 'style': return p.style;
      default: return [];
    }
  };

  function toggle(o: string) {
    const cur = chosen();
    let next: string[];
    if (isMulti(q)) {
      if (cur.includes(o)) next = cur.filter((x) => x !== o);
      else if (EXCLUSIVE.includes(o)) next = [o];
      else next = [...cur.filter((x) => !EXCLUSIVE.includes(x)), o];
    } else next = cur.includes(o) ? [] : [o];
    setP((a) => {
      switch (q) {
        case 'life': return { ...a, life: next as LifeProfile['life'] };
        case 'goals': {
          const goals = next as GoalId[];
          return { ...a, goals, primary: a.primary && goals.includes(a.primary) ? a.primary : null };
        }
        case 'primary': return { ...a, primary: (next[0] as GoalId) ?? null };
        case 'when': return { ...a, when: next as LifeProfile['when'] };
        case 'style': return { ...a, style: next as LifeProfile['style'] };
        default: return a;
      }
    });
  }

  function addTask() {
    const v = draft.replace(/\s+/g, ' ').trim().slice(0, MAX_TASK_LEN);
    if (!v || p.tasks.length >= MAX_TASKS || p.tasks.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    setP((a) => ({ ...a, tasks: [...a.tasks, v] }));
    setDraft('');
  }

  function next() {
    if (!last) return setI(i + 1);
    // Tasks are kept only with a clear yes. Without it they are dropped here and never saved.
    onDone({ ...p, tasks: keep ? p.tasks : [], at: Date.now() });
  }
  function back() {
    if (i > 0) setI(i - 1);
    else onBack?.();
  }

  const opts = optionsFor(q, p);
  const sel = chosen();
  const suggestion = q === 'when' && p.when.includes('suggest') ? suggestWhen(p) : undefined;
  const title = `profile.q.${q}`;
  const optKey = (o: string) => (q === 'primary' ? `profile.opt.goals.${o}` : `profile.opt.${q}.${o}`);

  return (
    <div className="pq">
      <div className="scene" key={q}>
        <h2>{t(`${title}.title`)}</h2>
        {t(`${title}.sub`) && <p className="note pq__sub">{t(`${title}.sub`)}</p>}

        {q === 'tasks' ? (
          <div className="pq__tasks">
            <ul>
              {p.tasks.map((x) => (
                <li key={x} className="crd crd--in">
                  <span className="grow" dir="auto">{x}</span>
                  <button type="button" aria-label={t('games.common.remove', { item: x })} onClick={() => setP((a) => ({ ...a, tasks: a.tasks.filter((y) => y !== x) }))}><X size={16} /></button>
                </li>
              ))}
            </ul>
            {p.tasks.length < MAX_TASKS && (
              <form className="pb__add" onSubmit={(e) => { e.preventDefault(); addTask(); }}>
                <input dir="auto" aria-label={t('profile.q.tasks.title')} placeholder={t('profile.q.tasks.ph')} maxLength={MAX_TASK_LEN} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <button type="submit" className="btn sm alt" aria-label={t('common.add')}><Plus size={16} aria-hidden="true" /></button>
              </form>
            )}
            {p.tasks.length > 0 && (
              <label className="pq__keep"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> <span>{t('profile.keepTasks')}</span></label>
            )}
          </div>
        ) : (
          <div className={`pq__opts ${opts.length <= 3 ? 'pq__opts--1' : ''}`} role={isMulti(q) ? 'group' : 'radiogroup'} aria-label={t(`${title}.title`)}>
            {opts.map((o) => {
              const Ic = ICONS[o] ?? Check;
              const on = sel.includes(o);
              return (
                <button key={o} type="button" className={`pq__b ${on ? 'on' : ''}`} role={isMulti(q) ? undefined : 'radio'} aria-pressed={isMulti(q) ? on : undefined} aria-checked={isMulti(q) ? undefined : on} onClick={() => toggle(o)}>
                  <span className="pq__i"><Ic size={18} aria-hidden="true" /></span>
                  <span className="grow">{t(optKey(o))}</span>
                  {on && <Check size={16} aria-hidden="true" className="pq__c" />}
                </button>
              );
            })}
          </div>
        )}

        {suggestion !== undefined && <p className="insight">{suggestion ? t(`profile.suggest.${suggestion}`) : t('profile.suggest.none')}</p>}
      </div>

      <div className="ob-act">
        {(i > 0 || onBack) && <button type="button" className="btn alt" onClick={back}><ArrowRight size={16} className="flip" aria-hidden="true" /> {t('common.back')}</button>}
        {!last && !sel.length && <button type="button" className="btn-link" onClick={next}>{t('common.skip')}</button>}
        <button type="button" className="btn" disabled={busy} onClick={next}>{t(last ? 'onboarding.finish' : 'common.next')}</button>
      </div>
    </div>
  );
}
