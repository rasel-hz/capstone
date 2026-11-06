import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fireConfetti, playSound } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import { isOneShot, type MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { Overlay } from '../../components/ui/Overlay';
import { useAppState, useStore } from '../../context/AppStateContext';
import { useCountUp } from '../../hooks/useCountUp';
import { useTimers } from '../../hooks/useTimers';
import type { GameResult, ViewId } from '../../types';
import { byGender, level } from '../../utils';
import { CHALLENGES, INSTRUCTIONS } from '../challenges/catalog';
import { GAMES } from '../challenges/games';
import type { GameEnv } from '../challenges/types';
import {
  abandonItem, advance, beginItem, completeItem, exitMission, finishMission, isPastEnd, pauseItem, resumeItem,
  shouldOfferEasier, skipItem, type MissionSummary,
} from './engine';

type Phase = 'intro' | 'preroll' | 'game' | 'result' | 'easier' | 'finish';
export type PlayerStart = 'intro' | 'run' | 'finish';

interface ResultView {
  xp: number;
  acc: number | null;
  note?: string;
  leveledUp: boolean;
  newLevel: number;
  last: boolean;
}

const XpLine = ({ xp }: { xp: number }) => <h2>+{useCountUp(xp)} XP</h2>;

export function MissionPlayer({ start, onClose, onNavigate }: { start: PlayerStart; onClose(): void; onNavigate(v: ViewId): void }) {
  const store = useStore();
  const s = useAppState();
  const M = s.mission!;
  const [phase, setPhase] = useState<Phase>(start === 'intro' ? 'intro' : 'preroll');
  const [runKey, setRunKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [mood, setMood] = useState<MascotState>('happy');
  const [bubble, setBubble] = useState('');
  const [result, setResult] = useState<ResultView | null>(null);
  const [summary, setSummary] = useState<MissionSummary | null>(null);
  const held = paused || confirmEnd;
  const timers = useTimers(held);
  const mascot = useMascot(mood);
  const it = M.items[Math.min(M.idx, M.items.length - 1)];
  const finishing = useRef(false);

  const say = useCallback((m: MascotState, t?: string) => {
    if (t != null) setBubble(t);
    if (isOneShot(m)) mascot.play(m);
    else setMood(m);
  }, [mascot.play]);
  const sfx = useCallback<GameEnv['sfx']>((k) => playSound(!!store.getState().snd, k), [store]);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    let sum: MissionSummary | null = null;
    store.update((d) => { sum = finishMission(d); });
    const r = sum as unknown as MissionSummary;
    setSummary(r);
    setPhase('finish');
    if (r.doneCount) {
      sfx('fin');
      fireConfetti(!!store.getState().rm);
      mascot.play('celebrating');
    }
    setMood(r.all ? 'happy' : r.doneCount ? 'idle' : 'calm');
  }, [store, sfx, mascot.play]);

  const run = useCallback(() => {
    timers.clear();
    store.update(beginItem);
    const st = store.getState();
    const id = st.mission!.items[st.mission!.idx].id;
    setResult(null);
    setRunKey((k) => k + 1);
    setPhase('preroll');
    setMood('listening');
    setBubble(INSTRUCTIONS[id]);
    timers.after(() => setPhase('game'), 2200);
  }, [store, timers]);

  const next = useCallback(() => {
    timers.clear();
    store.update(advance);
    const st = store.getState();
    if (isPastEnd(st)) return finish();
    setMood('curious');
    run();
  }, [store, timers, finish, run]);

  useEffect(() => {
    if (start === 'finish') {
      finish();
    } else if (start === 'run') {
      run();
    } else {
      setBubble(M.solo ? 'يلا يا وحش، وريني شطارتك!' : byGender(s.g, 'يلا يا وحش، وريني شطارتك!', 'يلا يا وحشة، وريني شطارتك!'));
      mascot.play('greeting');
    }
    // Runs once when the player opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onDone(r: GameResult) {
    let out: ReturnType<typeof completeItem> = null;
    store.update((d) => { out = completeItem(d, r); });
    const o = out as ReturnType<typeof completeItem>;
    if (!o) return;
    timers.clear();
    const st = store.getState();
    const m = st.mission!;
    const done = m.items[m.idx];
    const nextItem = m.items[m.idx + 1];
    playSound(!!st.snd, 'fin');
    say(r.mood || 'celebrating', r.say ?? (r.acc == null ? 'يا سلام عليك! خذتها على هونك.' : r.retries ? 'رجعت وحاولت مرة ثانية، وهذا يحسب لك.' : 'يا سلام! كذا الشغل.'));
    if (o.leveledUp) fireConfetti(!!st.rm);
    setResult({ xp: o.xp, acc: r.acc, note: r.note, leveledUp: o.leveledUp, newLevel: o.newLevel, last: !nextItem });
    setPhase('result');
    if (shouldOfferEasier(done, nextItem)) {
      timers.after(() => {
        say('concerned', 'لاحظت إن هالتحدي كان فيه صعوبة. أخفف اللي بعده؟');
        setPhase('easier');
      }, 1800);
    } else {
      timers.after(next, 2700);
    }
  }

  function setNextDifficulty(easier: boolean) {
    if (easier) store.update((d) => { d.mission!.items[d.mission!.idx + 1].diff = 'easy'; });
    next();
  }

  function skip() {
    if (it.status !== 'COMPLETED') store.update(skipItem);
    next();
  }
  function endConfirmed() {
    setConfirmEnd(false);
    store.update(abandonItem);
    next();
  }
  function pause() {
    store.update(pauseItem);
    setPaused(true);
  }
  function resume() {
    store.update(resumeItem);
    setPaused(false);
  }
  function exit() {
    timers.clear();
    store.update(exitMission);
    onClose();
  }

  const env: GameEnv = useMemo(
    () => ({ paused: held, g: s.g, hasEvent: s.ctx.includes('event'), say, sfx }),
    [held, s.g, s.ctx, say, sfx],
  );

  if (phase === 'finish' && summary) {
    return <Completion summary={summary} mascotState={mascot.state} onClose={onClose} onNavigate={onNavigate} />;
  }

  const Game = GAMES[it.id];
  return (
    <div className="mp">
      <div className="mpw">
        <div className="mpt">
          <div className="dots" aria-label={`التحدي ${M.idx + 1} من ${M.items.length}`}>
            {M.items.map((_, i) => <i key={i} className={i < M.idx ? 'on' : i === M.idx ? 'cur' : ''} />)}
          </div>
          <div className="row">
            <button type="button" className="chip" onClick={pause}>⏸ إيقاف</button>
            <button type="button" className="chip" onClick={skip}>تخطي</button>
            <button type="button" className="chip" onClick={() => (it.status === 'COMPLETED' ? next() : setConfirmEnd(true))}>إنهاء التحدي</button>
            <button type="button" className="chip" aria-label={s.snd ? 'كتم الصوت' : 'تشغيل الصوت'} onClick={() => store.update((d) => { d.snd = d.snd ? 0 : 1; })}>{s.snd ? '🔊' : '🔇'}</button>
            <button type="button" className="chip" onClick={exit}>✕ خروج</button>
          </div>
        </div>
        <div className="cb">
          <Mascot state={mascot.state} size={86} still={phase === 'game'} />
          <div className="bub" aria-live="polite">{bubble}</div>
        </div>
        <div className="card stage">
          {phase === 'intro' && (
            <div className="scene">
              <h2>{M.solo ? CHALLENGES[M.items[0].id].t : 'مهمة اليوم'}</h2>
              {M.items.map((g, i) => (
                <div key={i} className="it"><h3>{i + 1}. {CHALLENGES[g.id].t}</h3><p className="note">{g.why}</p></div>
              ))}
              <p className="note">تبدأها مرة وحدة، وبعدها ننتقل بين التحديات تلقائيًا.</p>
              <button type="button" className="btn" onClick={run}>يلا نبدأ</button>
            </div>
          )}
          {phase === 'preroll' && (
            <div className="scene" key={runKey}>
              <h2>{CHALLENGES[it.id].t}</h2>
              <p>{INSTRUCTIONS[it.id]}</p>
              <p className="note">{it.diff === 'easy' ? 'نسخة أسهل · ' : ''}يبدأ بعد لحظات...</p>
            </div>
          )}
          {phase === 'game' && <Game key={runKey} diff={it.diff} env={env} onDone={onDone} />}
          {phase === 'result' && result && (
            <div className="scene result">
              <XpLine xp={result.xp} />
              {result.acc != null && <p className="result__acc">{result.acc}%</p>}
              {result.note && <p>{result.note}</p>}
              {result.leveledUp && <p className="levelup"><b>🎉 وصلت المستوى {result.newLevel}!</b></p>}
              <p>{result.last ? 'خلصنا آخر تحدي!' : 'خلصنا تحدي! عندي لك شي ثاني الحين.'}</p>
              <div className="bar"><i className="bar-drain" style={{ animationDuration: '2.6s', animationPlayState: held ? 'paused' : 'running' }} /></div>
            </div>
          )}
          {phase === 'easier' && (
            <div className="scene">
              <p>تبي نسخة أسهل من "{CHALLENGES[M.items[M.idx + 1].id].t}"؟ القرار لك.</p>
              <button type="button" className="btn" onClick={() => setNextDifficulty(true)}>إي، خففها</button>{' '}
              <button type="button" className="btn alt" onClick={() => setNextDifficulty(false)}>لا، عادي</button>
            </div>
          )}
        </div>
      </div>
      {paused && (
        <Overlay label="إيقاف مؤقت" top>
          <Mascot state="resting" size={80} />
          <h2>وقفنا شوي</h2>
          <p>خذ راحتك.</p>
          <button type="button" className="btn" onClick={resume}>كمّل</button>
        </Overlay>
      )}
      {confirmEnd && (
        <Overlay label="إنهاء التحدي" top>
          <h2>تنهي هالتحدي؟</h2>
          <p>نحفظ محاولتك، بس ما نعلّمه مكتمل. ما فيه لوم.</p>
          <button type="button" className="btn" onClick={endConfirmed}>إنهاء</button>{' '}
          <button type="button" className="btn alt" onClick={() => setConfirmEnd(false)}>رجوع</button>
        </Overlay>
      )}
    </div>
  );
}

function Completion({ summary, mascotState, onClose, onNavigate }: { summary: MissionSummary; mascotState: MascotState; onClose(): void; onNavigate(v: ViewId): void }) {
  const s = useAppState();
  const xp = useCountUp(summary.xp, 900);
  const { all, doneCount } = summary;
  const leave = (v: ViewId) => {
    onClose();
    onNavigate(v);
  };
  return (
    <div className="mp">
      <div className="mpw completion">
        <Mascot state={mascotState} size={170} label="خويّك" />
        <h1>{all ? byGender(s.g, 'ياخي أنت كفو!', 'ياخي أنتِ كفو!') : doneCount ? 'انتهت المهمة' : 'ولا يهمك، انتهت المهمة'}</h1>
        <p className="completion__xp">+{xp} XP</p>
        <p className="note">المستوى {level(s)}</p>
        <div className="card completion__card">
          <h3>اللي صار فعلاً</h3>
          <p>{summary.lines}.</p>
          <h3>اقتراح بكرة</h3>
          <p>{summary.suggestion}</p>
          {s.prayer && <p className="note">وإذا قرب وقت الصلاة نرتب يومنا حولها.</p>}
          <p className="note">هذي نتائج ألعاب للمتابعة الشخصية، ما تدل على تحسن علاجي.</p>
        </div>
        <button type="button" className="btn" onClick={() => leave('chat')}>سولف مع خويّك</button>{' '}
        <button type="button" className="btn alt" onClick={() => leave('prog')}>تطوري</button>{' '}
        <button type="button" className="btn alt" onClick={() => leave('home')}>الرئيسية</button>
      </div>
    </div>
  );
}
