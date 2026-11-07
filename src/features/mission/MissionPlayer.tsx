import { Check, ChevronLeft, Clock, FastForward, Flag, Pause, Play, Sparkles, Target, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fireConfetti, playSound, prefersReduced } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import { isOneShot, type MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { Segmented } from '../../components/ui/kit';
import { Overlay } from '../../components/ui/Overlay';
import { useAppState, useStore } from '../../context/AppStateContext';
import { useCountUp } from '../../hooks/useCountUp';
import { useTimers } from '../../hooks/useTimers';
import type { Difficulty, GameResult, ViewId } from '../../types';
import { byGender, level } from '../../utils';
import { CHALLENGES, INSTRUCTIONS } from '../challenges/catalog';
import { ChallengeArt, OasisBackdrop } from '../challenges/ChallengeArt';
import { GAMES } from '../challenges/games';
import type { GameEnv } from '../challenges/types';
import {
  abandonItem, advance, beginItem, completeItem, exitMission, finishMission, isPastEnd, pauseItem, resumeItem,
  shouldOfferEasier, skipItem, type MissionSummary,
} from './engine';
import { MissionTimeline } from './MissionTimeline';

type Phase = 'intro' | 'preroll' | 'game' | 'result' | 'easier' | 'finish';
export type PlayerStart = 'intro' | 'run' | 'finish';

interface ResultView {
  xp: number;
  base: number;
  acc: number | null;
  retries: number;
  note?: string;
  leveledUp: boolean;
  newLevel: number;
  last: boolean;
}

const PREROLL_MS = 3200;
const RESULT_MS = 4200;
const minutes = (m: number) => (m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : `${m} دقائق`);

function XpLine({ xp }: { xp: number }) {
  const v = useCountUp(xp);
  return <p className="res__xp"><Sparkles size={20} aria-hidden="true" /> +{v} نقطة</p>;
}

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
  const [round, setRound] = useState<{ c: number; t: number; l: string } | null>(null);
  const [result, setResult] = useState<ResultView | null>(null);
  const [summary, setSummary] = useState<MissionSummary | null>(null);
  const [resumed] = useState(start === 'run');
  const held = paused || confirmEnd;
  const timers = useTimers(held);
  const mascot = useMascot(mood);
  const it = M.items[Math.min(M.idx, M.items.length - 1)];
  const finishing = useRef(false);
  const advanced = useRef(false);

  const say = useCallback((m: MascotState, t?: string) => {
    if (t != null) setBubble(t);
    if (isOneShot(m)) mascot.play(m);
    else setMood(m);
  }, [mascot.play]);
  const sfx = useCallback<GameEnv['sfx']>((k) => playSound(!!store.getState().snd, k), [store]);
  const reportRound = useCallback<GameEnv['round']>((c, t, l = 'الجولة') => setRound(t ? { c, t, l } : null), []);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    let sum: MissionSummary | null = null;
    store.update((d) => { sum = finishMission(d); });
    const r = sum as unknown as MissionSummary;
    setSummary(r);
    setPhase('finish');
    if (r.quiet) {
      setMood('calm');
      return;
    }
    if (r.doneCount) {
      sfx('fin');
      fireConfetti(!!store.getState().rm);
      mascot.play('celebrating');
    }
    setMood(r.all ? 'happy' : r.doneCount ? 'idle' : 'calm');
  }, [store, sfx, mascot.play]);

  const startGame = useCallback(() => {
    timers.clear();
    setPhase('game');
  }, [timers]);

  const run = useCallback(() => {
    timers.clear();
    store.update(beginItem);
    const st = store.getState();
    const id = st.mission!.items[st.mission!.idx].id;
    setResult(null);
    setRound(null);
    setRunKey((k) => k + 1);
    setPhase('preroll');
    setMood('listening');
    const isResume = resumed && !advanced.current;
    setBubble(isResume ? 'آخر مرة وقفنا هنا. نعيد هذا التحدي من أوله، ومحاولاتك السابقة محفوظة.' : INSTRUCTIONS[id]);
    timers.after(() => setPhase('game'), isResume ? PREROLL_MS + 1600 : PREROLL_MS);
  }, [store, timers, resumed]);

  const next = useCallback(() => {
    timers.clear();
    advanced.current = true;
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
      setBubble(M.solo ? INSTRUCTIONS[M.items[0].id] : byGender(s.g, 'يلا يا وحش، وريني شطارتك!', 'يلا يا وحشة، وريني شطارتك!'));
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
    if (!CHALLENGES[done.id].selfReport) playSound(!!st.snd, 'fin');
    say(r.mood || 'celebrating', r.say ?? (r.acc == null ? 'خذتها على هونك.' : r.retries ? 'رجعت وحاولت مرة ثانية، وهذا يحسب لك.' : 'يا سلام! كذا الشغل.'));
    if (o.leveledUp) fireConfetti(!!st.rm);
    setRound(null);
    setResult({ xp: o.xp, base: CHALLENGES[done.id].xp, acc: r.acc, retries: r.retries, note: r.note, leveledUp: o.leveledUp, newLevel: o.newLevel, last: !nextItem });
    setPhase('result');
    if (shouldOfferEasier(done, nextItem)) {
      timers.after(() => {
        say('concerned', 'لاحظت إن هالتحدي كان فيه محاولات. أخفف اللي بعده؟');
        setPhase('easier');
      }, RESULT_MS - 1000);
    } else {
      timers.after(next, RESULT_MS);
    }
  }

  function setNextDifficulty(easier: boolean) {
    if (easier) store.update((d) => { d.mission!.items[d.mission!.idx + 1].diff = 'easy'; });
    next();
  }

  function setDiff(diff: Difficulty) {
    store.update((d) => { d.mission!.items[d.mission!.idx].diff = diff; });
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

  const rm = !!s.rm || prefersReduced();
  const env: GameEnv = useMemo(
    () => ({ paused: held, g: s.g, hasEvent: s.ctx.includes('event'), sched: s.sched, rm, snd: !!s.snd, say, sfx, round: reportRound }),
    [held, s.g, s.ctx, s.sched, rm, s.snd, say, sfx, reportRound],
  );

  if (phase === 'finish' && summary) {
    return <Completion summary={summary} mascotState={mascot.state} onClose={onClose} onNavigate={onNavigate} />;
  }

  const Game = GAMES[it.id];
  const c = CHALLENGES[it.id];
  const inPlay = phase === 'game' || phase === 'preroll';
  return (
    <div className={`mp mp--${phase}`}>
      <header className="gh">
        <button type="button" className="gh__b" onClick={exit} aria-label="خروج وحفظ المهمة"><X size={19} aria-hidden="true" /><span>خروج</span></button>
        <div className="gh__mid">
          <b className="gh__t">{phase === 'intro' && !M.solo ? 'مهمة اليوم' : c.t}</b>
          <div className="gh__p">
            {M.items.length > 1 && (
              <div className="dots" role="img" aria-label={`التحدي ${M.idx + 1} من ${M.items.length}`}>
                {M.items.map((g, i) => <i key={i} className={i < M.idx ? (g.status === 'COMPLETED' ? 'on' : 'off') : i === M.idx ? 'cur' : ''} />)}
              </div>
            )}
            {round && phase === 'game' && <span className="gh__r" aria-live="polite">{round.l} {round.c} من {round.t}</span>}
          </div>
        </div>
        <div className="gh__act">
          <button type="button" className="gh__b" aria-label={s.snd ? 'كتم الصوت' : 'تشغيل الصوت'} onClick={() => store.update((d) => { d.snd = d.snd ? 0 : 1; })}>{s.snd ? <Volume2 size={19} aria-hidden="true" /> : <VolumeX size={19} aria-hidden="true" />}</button>
          {inPlay && (
            <>
              <button type="button" className="gh__b" onClick={pause} aria-label="إيقاف مؤقت"><Pause size={19} aria-hidden="true" /><span>إيقاف</span></button>
              <button type="button" className="gh__b" onClick={skip} aria-label="تخطي"><FastForward size={19} aria-hidden="true" /><span>تخطي</span></button>
              <button type="button" className="gh__b" onClick={() => setConfirmEnd(true)} aria-label="إنهاء التحدي"><Flag size={19} aria-hidden="true" /><span>إنهاء</span></button>
            </>
          )}
        </div>
      </header>

      <div className="mpw">
        <div className={`cb ${phase === 'game' ? 'cb--small' : ''}`}>
          <Mascot state={mascot.state} size={phase === 'game' ? 48 : 84} still={phase === 'game'} />
          <div className="bub" aria-live="polite">{bubble}</div>
        </div>

        <div className="stage">
          {phase === 'intro' && M.solo && (
            <div className="scene intro">
              <div className="intro__art"><ChallengeArt id={it.id} /></div>
              <h1>{c.t}</h1>
              <p>{INSTRUCTIONS[it.id]}</p>
              <div className="meta meta--c">
                <span><Clock size={14} aria-hidden="true" /> تقريبًا {minutes(c.min)}</span>
                <span><Sparkles size={14} aria-hidden="true" /> {c.xp ? `${c.xp} نقطة` : 'بدون نقاط'}</span>
              </div>
              {c.hasEasy && (
                <Segmented className="seg--c" label="الصعوبة" value={it.diff} options={[{ value: 'normal', label: 'عادي' }, { value: 'easy', label: 'أسهل' }]} onChange={setDiff} />
              )}
              <button type="button" className="btn btn--lg" onClick={run}><Play size={17} aria-hidden="true" /> ابدأ</button>
            </div>
          )}
          {phase === 'intro' && !M.solo && (
            <div className="scene intro">
              <h1>مهمة اليوم</h1>
              <MissionTimeline items={M.items} />
              <p className="note">تبدأها مرة وحدة، وبعدها ننتقل بين التحديات تلقائيًا. تقدر توقف أو تطلع بأي وقت.</p>
              <button type="button" className="btn btn--lg" onClick={run}><Play size={17} aria-hidden="true" /> يلا نبدأ</button>
            </div>
          )}
          {phase === 'preroll' && (
            <div className="scene intro" key={runKey}>
              <div className="intro__art"><ChallengeArt id={it.id} /></div>
              <h1>{c.t}</h1>
              <p>{INSTRUCTIONS[it.id]}</p>
              <p className="note">{it.diff === 'easy' ? 'نسخة أسهل · ' : ''}تقريبًا {minutes(c.min)}</p>
              <div className="bar bar--thin"><i className="bar-drain" style={{ animationDuration: `${PREROLL_MS}ms`, animationPlayState: held ? 'paused' : 'running' }} /></div>
              <button type="button" className="btn" onClick={startGame}>ابدأ الحين</button>
            </div>
          )}
          {phase === 'game' && <Game key={runKey} diff={it.diff} env={env} onDone={onDone} />}
          {phase === 'result' && result && (
            <div className="scene res">
              <span className="res__ok"><Check size={15} aria-hidden="true" /> مكتمل</span>
              {result.base > 0 ? <XpLine xp={result.xp} /> : <p className="note">ما عليها نقاط، لأنها مشاعرك أنت.</p>}
              {result.base > 0 && result.xp < result.base && <p className="note">نص النقاط، لأن الدقة أقل من ٥٠٪.</p>}
              {result.acc != null && (
                <div className="res__m">
                  <div><Target size={16} aria-hidden="true" /><b>{result.acc}%</b><span>الدقة</span></div>
                  <div><b>{result.retries}</b><span>إعادات</span></div>
                </div>
              )}
              {result.note && <p>{result.note}</p>}
              {result.leveledUp && <p className="levelup"><Sparkles size={16} aria-hidden="true" /> وصلت المستوى {result.newLevel}</p>}
              <div className="bar bar--thin"><i className="bar-drain" style={{ animationDuration: `${RESULT_MS}ms`, animationPlayState: held ? 'paused' : 'running' }} /></div>
              <button type="button" className="btn" onClick={() => { if (shouldOfferEasier(M.items[M.idx], M.items[M.idx + 1])) { timers.clear(); setPhase('easier'); say('concerned', 'أخفف اللي بعده؟'); } else next(); }}>
                {result.last ? 'شوف الملخص' : 'التالي'} <ChevronLeft size={17} aria-hidden="true" />
              </button>
            </div>
          )}
          {phase === 'easier' && (
            <div className="scene res">
              <h2>تبي نسخة أسهل من «{CHALLENGES[M.items[M.idx + 1].id].t}»؟</h2>
              <p className="note">القرار لك.</p>
              <div className="row row--c">
                <button type="button" className="btn" onClick={() => setNextDifficulty(true)}>إي، خففها</button>
                <button type="button" className="btn alt" onClick={() => setNextDifficulty(false)}>لا، عادي</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {paused && (
        <Overlay label="إيقاف مؤقت" top>
          <Mascot state="resting" size={80} />
          <h2>وقفنا شوي</h2>
          <p>خذ راحتك. الوقت موقف، وما يحسب عليك.</p>
          <button type="button" className="btn" onClick={resume}><Play size={16} aria-hidden="true" /> كمّل</button>
        </Overlay>
      )}
      {confirmEnd && (
        <Overlay label="إنهاء التحدي" top>
          <h2>تنهي هالتحدي؟</h2>
          <p>نحفظ محاولتك، بس ما نعلّمه مكتمل وما عليه نقاط. ما فيه لوم.</p>
          <div className="row row--c">
            <button type="button" className="btn" onClick={endConfirmed}>إنهاء</button>
            <button type="button" className="btn alt" onClick={() => setConfirmEnd(false)}>رجوع</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Completion({ summary, mascotState, onClose, onNavigate }: { summary: MissionSummary; mascotState: MascotState; onClose(): void; onNavigate(v: ViewId): void }) {
  const s = useAppState();
  const xp = useCountUp(summary.xp, 900);
  const { all, doneCount, total, quiet } = summary;
  const leave = (v: ViewId) => {
    onClose();
    onNavigate(v);
  };
  return (
    <div className="mp mp--finish">
      <div className="done">
        <div className="done__scene">
          <OasisBackdrop />
          <Mascot state={mascotState} size={130} label="خويّك" className="done__m" />
        </div>
        <div className="done__body">
          <h1>{quiet ? 'شكرًا إنك شاركتني' : all ? byGender(s.g, 'ياخي أنت كفو!', 'ياخي أنتِ كفو!') : doneCount ? 'انتهت المهمة' : 'ولا يهمك، انتهت المهمة'}</h1>
          {!quiet && (
            <>
              <div className="res__m">
                <div><b>{doneCount} من {total}</b><span>مكتملة</span></div>
                <div><b>+{xp}</b><span>نقطة</span></div>
                <div><b>{level(s)}</b><span>المستوى</span></div>
              </div>
              <MissionTimeline items={s.mission!.items} />
              <h3>اللي صار فعلاً</h3>
            </>
          )}
          <p>{summary.lines}.</p>
          {!quiet && <h3>اقتراح لبكرة</h3>}
          <p>{summary.suggestion}</p>
          {s.prayer && <p className="note">وإذا قرب وقت الصلاة نرتب يومنا حولها.</p>}
          {!quiet && <p className="note">هذي نتائج ألعاب للمتابعة الشخصية، وما تدل على تحسن علاجي.</p>}
          <div className="row row--c">
            <button type="button" className="btn" onClick={() => leave('chat')}>سولف مع خويّك</button>
            <button type="button" className="btn alt" onClick={() => leave('prog')}>تطوري</button>
            <button type="button" className="btn alt" onClick={() => leave('home')}>الرئيسية</button>
          </div>
        </div>
      </div>
    </div>
  );
}
