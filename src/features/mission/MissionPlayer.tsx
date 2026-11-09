import { Check, ChevronLeft, Clock, FastForward, Flag, Pause, Play, Sparkles, Target, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fireConfetti, playSound, prefersReduced } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import { isOneShot, type MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { Segmented } from '../../components/ui/kit';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { Overlay } from '../../components/ui/Overlay';
import { useAppState, useStore } from '../../context/AppStateContext';
import { isPlanResult, validatePlanConfig } from '../plan/config';
import { acknowledge, needsCheckIn } from '../prayer/gate';
import { PrayerCheckIn } from '../prayer/PrayerBreak';
import type { PrayerWindow } from '../prayer/times';
import { useMissions } from './MissionProvider';
import { StreakDone } from '../streak/StreakBits';
import { planSummary } from '../challenges/games/PersonalPlanGame';
import { useCountUp } from '../../hooks/useCountUp';
import { useTimers } from '../../hooks/useTimers';
import { useBackHandler } from '../../services/native';
import { msg, tr, type Msg } from '../../i18n';
import type { Difficulty, GameResult, ViewId } from '../../types';
import { level } from '../../utils';
import { CHALLENGES } from '../challenges/catalog';
import { ChallengeArt, OasisBackdrop } from '../challenges/ChallengeArt';
import { GAMES } from '../challenges/games';
import type { GameEnv } from '../challenges/types';
import {
  abandonItem, advance, beginItem, completeItem, exitMission, finishMission, isPastEnd, pauseItem, resumeItem,
  shouldOfferEasier, skipItem, summaryLines, summarySuggestion, type MissionSummary,
} from './engine';
import { reportStart } from '../../services/points';
import { claimDailyBonusAfterSync } from '../../services/progressSync';
import { MissionTimeline } from './MissionTimeline';

type Phase = 'intro' | 'preroll' | 'game' | 'result' | 'easier' | 'finish';
export type PlayerStart = 'intro' | 'run' | 'finish';

interface ResultView {
  xp: number;
  base: number;
  acc: number | null;
  retries: number;
  note?: Msg;
  leveledUp: boolean;
  newLevel: number;
  last: boolean;
}

const PREROLL_MS = 3200;
const RESULT_MS = 4200;

function XpLine({ xp }: { xp: number }) {
  const { t } = useTranslation();
  const v = useCountUp(xp);
  return <p className="res__xp"><Sparkles size={20} aria-hidden="true" /> {t('player.xpGain', { n: v })}</p>;
}

export function MissionPlayer({ start, onClose, onNavigate }: { start: PlayerStart; onClose(): void; onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const store = useStore();
  const s = useAppState();
  const M = s.mission!;
  const [phase, setPhase] = useState<Phase>(start === 'intro' ? 'intro' : 'preroll');
  const [runKey, setRunKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [mood, setMood] = useState<MascotState>('happy');
  const [bubble, setBubble] = useState<Msg>('');
  const [round, setRound] = useState<{ c: number; t: number; l: string } | null>(null);
  const [result, setResult] = useState<ResultView | null>(null);
  const [summary, setSummary] = useState<MissionSummary | null>(null);
  const [prayerAsk, setPrayerAsk] = useState<PrayerWindow | null>(null);
  const missions = useMissions();
  const [resumed] = useState(start === 'run');
  const held = paused || confirmEnd;
  const timers = useTimers(held);
  const mascot = useMascot(mood);
  const it = M.items[Math.min(M.idx, M.items.length - 1)];
  const finishing = useRef(false);
  const advanced = useRef(false);

  // The bubble keeps a key or function, wrapped so React doesn't treat a function as a state updater.
  const setSpeech = useCallback((m: Msg) => setBubble(() => m), []);
  const say = useCallback((m: MascotState, text?: Msg) => {
    if (text != null) setSpeech(text);
    if (isOneShot(m)) mascot.play(m);
    else setMood(m);
  }, [mascot.play, setSpeech]);
  const sfx = useCallback<GameEnv['sfx']>((k) => playSound(!!store.getState().snd, k), [store]);
  const reportRound = useCallback<GameEnv['round']>((c, total, l = 'games.common.round') => setRound(total ? { c, t: total, l } : null), []);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    let sum: MissionSummary | null = null;
    store.update((d) => { sum = finishMission(d); });
    const r = sum as unknown as MissionSummary;
    if (r.all && !r.solo && !r.quiet) void claimDailyBonusAfterSync(store.getState().mission!.id);
    setSummary(r);
    setPhase('finish');
    // Self-report check-ins, and quiet challenges such as dhikr before sleep, end without sound or confetti.
    if (r.quiet || store.getState().mission!.items.every((i) => CHALLENGES[i.id].quiet)) {
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
    // The server records the start time, so a completion can be checked before points are awarded.
    reportStart(st.mission!.id, st.mission!.idx, id, !st.mission!.solo);
    setResult(null);
    setRound(null);
    setRunKey((k) => k + 1);
    setPhase('preroll');
    setMood('listening');
    const isResume = resumed && !advanced.current;
    setSpeech(isResume ? 'player.resumeNote' : `challenges.items.${id}.instructions`);
    timers.after(() => setPhase('game'), isResume ? PREROLL_MS + 1600 : PREROLL_MS);
  }, [store, timers, resumed, setSpeech]);

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
      setSpeech(M.solo ? `challenges.items.${M.items[0].id}.instructions` : (s.g === 'f' ? 'player.go_f' : 'player.go_m'));
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
    // The companion follows up only on what was actually chosen and saved.
    if (isPlanResult(r.data)) {
      const plan = r.data;
      store.update((d) => { d.chat.push({ b: 1, t: `${planSummary(plan)} ${tr('games.plan.followUp')}` }); });
    }
    timers.clear();
    const st = store.getState();
    const m = st.mission!;
    const done = m.items[m.idx];
    const nextItem = m.items[m.idx + 1];
    const hushed = !!CHALLENGES[done.id].selfReport || !!CHALLENGES[done.id].quiet;
    if (!hushed) playSound(!!st.snd, 'fin');
    say(r.mood || 'celebrating', r.say ?? (r.acc == null ? 'player.sayDone' : r.retries ? 'player.sayRetried' : 'player.sayGood'));
    if (o.leveledUp && !CHALLENGES[done.id].quiet) fireConfetti(!!st.rm);
    setRound(null);
    setResult({ xp: o.xp, base: CHALLENGES[done.id].xp, acc: r.acc, retries: r.retries, note: r.note, leveledUp: o.leveledUp, newLevel: o.newLevel, last: !nextItem });
    setPhase('result');
    // A prayer window that began during the game is raised here, between challenges, never mid-round.
    const pw = nextItem ? needsCheckIn(st) : null;
    if (pw) {
      setPrayerAsk(pw);
      return;
    }
    if (shouldOfferEasier(done, nextItem)) {
      timers.after(() => {
        say('concerned', 'player.offerEasier');
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

  // Android back button: close whatever is on top, otherwise leave and save, the same as Exit.
  useBackHandler(() => {
    if (confirmEnd) setConfirmEnd(false);
    else if (paused) resume();
    else exit();
  }, phase !== 'finish');

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
  // A personal planning board is named for what it is, not as the general example.
  const personal = it.id === 'seq' && !!validatePlanConfig(it.cfg);
  const name = personal ? t('games.plan.title') : t(`challenges.items.${it.id}.name`);
  const instructions = personal ? t('games.plan.instructions') : t(`challenges.items.${it.id}.instructions`);
  const inPlay = phase === 'game' || phase === 'preroll';
  return (
    <div className={`mp mp--${phase}`}>
      <header className="gh">
        <button type="button" className="gh__b" onClick={exit} aria-label={t('player.exitLabel')}><X size={19} aria-hidden="true" /><span>{t('player.exit')}</span></button>
        <div className="gh__mid">
          <b className="gh__t">{phase === 'intro' && !M.solo ? t('player.dailyTitle') : name}</b>
          <div className="gh__p">
            {M.items.length > 1 && (
              <div className="dots" role="img" aria-label={t('player.challengeOf', { n: M.idx + 1, total: M.items.length })}>
                {M.items.map((g, i) => <i key={i} className={i < M.idx ? (g.status === 'COMPLETED' ? 'on' : 'off') : i === M.idx ? 'cur' : ''} />)}
              </div>
            )}
            {round && phase === 'game' && <span className="gh__r" aria-live="polite">{t('player.roundOf', { label: t(round.l), n: round.c, total: round.t })}</span>}
          </div>
        </div>
        <div className="gh__act">
          <LanguageSwitcher />
          <button type="button" className="gh__b" aria-label={t(s.snd ? 'player.mute' : 'player.unmute')} onClick={() => store.update((d) => { d.snd = d.snd ? 0 : 1; })}>{s.snd ? <Volume2 size={19} aria-hidden="true" /> : <VolumeX size={19} aria-hidden="true" />}</button>
          {inPlay && (
            <>
              <button type="button" className="gh__b" onClick={pause} aria-label={t('player.pauseLabel')}><Pause size={19} aria-hidden="true" /><span>{t('player.pause')}</span></button>
              <button type="button" className="gh__b" onClick={skip} aria-label={t('player.skip')}><FastForward size={19} aria-hidden="true" /><span>{t('player.skip')}</span></button>
              <button type="button" className="gh__b" onClick={() => setConfirmEnd(true)} aria-label={t('player.endLabel')}><Flag size={19} aria-hidden="true" /><span>{t('player.end')}</span></button>
            </>
          )}
        </div>
      </header>

      <div className="mpw">
        <div className={`cb ${phase === 'game' ? 'cb--small' : ''}`}>
          <Mascot state={mascot.state} size={phase === 'game' ? 48 : 84} still={phase === 'game'} />
          <div className="bub" aria-live="polite">{msg(bubble)}</div>
        </div>

        <div className="stage">
          {phase === 'intro' && M.solo && (
            <div className="scene intro">
              <div className="intro__art"><ChallengeArt id={it.id} /></div>
              <h1>{name}</h1>
              <p>{instructions}</p>
              <div className="meta meta--c">
                <span><Clock size={14} aria-hidden="true" /> {t('player.about', { time: t('common.minutes', { count: c.min }) })}</span>
                <span><Sparkles size={14} aria-hidden="true" /> {c.xp ? t('common.points', { count: c.xp }) : t('common.noPoints')}</span>
              </div>
              {c.hasEasy && (
                <Segmented<Difficulty> className="seg--c" label={t('player.difficulty')} value={it.diff} options={[{ value: 'normal', label: t('player.normal') }, { value: 'easy', label: t('player.easier') }]} onChange={setDiff} />
              )}
              <button type="button" className="btn btn--lg" onClick={run}><Play size={17} aria-hidden="true" /> {t('common.start')}</button>
            </div>
          )}
          {phase === 'intro' && !M.solo && (
            <div className="scene intro">
              <h1>{t('player.dailyTitle')}</h1>
              <MissionTimeline items={M.items} />
              <p className="note">{t('player.dailyNote')}</p>
              <button type="button" className="btn btn--lg" onClick={run}><Play size={17} aria-hidden="true" /> {t('player.letsGo')}</button>
            </div>
          )}
          {phase === 'preroll' && (
            <div className="scene intro" key={runKey}>
              <div className="intro__art"><ChallengeArt id={it.id} /></div>
              <h1>{name}</h1>
              <p>{instructions}</p>
              <p className="note">{it.diff === 'easy' ? t('player.easierPrefix') : ''}{t('player.about', { time: t('common.minutes', { count: c.min }) })}</p>
              <div className="bar bar--thin"><i className="bar-drain" style={{ animationDuration: `${PREROLL_MS}ms`, animationPlayState: held ? 'paused' : 'running' }} /></div>
              <button type="button" className="btn" onClick={startGame}>{t('player.startNow')}</button>
            </div>
          )}
          {phase === 'game' && <Game key={runKey} diff={it.diff} env={env} onDone={onDone} cfg={validatePlanConfig(it.cfg)} />}
          {phase === 'result' && result && (
            <div className="scene res">
              <span className="res__ok"><Check size={15} aria-hidden="true" /> {t('player.status.completed')}</span>
              {result.base > 0 ? <XpLine xp={result.xp} /> : <p className="note">{t('player.noPointsFeelings')}</p>}
              {result.base > 0 && result.xp < result.base && <p className="note">{t('player.halfPoints')}</p>}
              {result.acc != null && (
                <div className="res__m">
                  <div><Target size={16} aria-hidden="true" /><b>{result.acc}%</b><span>{t('player.accuracy')}</span></div>
                  <div><b>{result.retries}</b><span>{t('player.retries')}</span></div>
                </div>
              )}
              {result.note && <p>{msg(result.note)}</p>}
              {result.leveledUp && <p className="levelup"><Sparkles size={16} aria-hidden="true" /> {t('player.levelUp', { n: result.newLevel })}</p>}
              {prayerAsk ? (
                <PrayerCheckIn
                  compact
                  window={prayerAsk}
                  onPrayed={() => { store.update((d) => acknowledge(d, prayerAsk, 'prayed')); setPrayerAsk(null); next(); }}
                  onNotYet={() => {
                    // The mission is saved exactly as it is now; the next challenge waits for the user.
                    const w = prayerAsk;
                    store.update((d) => { advance(d); exitMission(d); });
                    onClose();
                    missions.openBreak(w);
                  }}
                  onNotNow={() => { store.update((d) => acknowledge(d, prayerAsk, 'later')); setPrayerAsk(null); next(); }}
                />
              ) : (
              <>
              <div className="bar bar--thin"><i className="bar-drain" style={{ animationDuration: `${RESULT_MS}ms`, animationPlayState: held ? 'paused' : 'running' }} /></div>
              <button type="button" className="btn" onClick={() => { if (shouldOfferEasier(M.items[M.idx], M.items[M.idx + 1])) { timers.clear(); setPhase('easier'); say('concerned', 'player.offerEasierShort'); } else next(); }}>
                {t(result.last ? 'player.seeSummary' : 'common.next')} <ChevronLeft size={17} className="flip" aria-hidden="true" />
              </button>
              </>
              )}
            </div>
          )}
          {phase === 'easier' && (
            <div className="scene res">
              <h2>{t('player.easierQ', { name: t(`challenges.items.${M.items[M.idx + 1].id}.name`) })}</h2>
              <p className="note">{t('player.yourCall')}</p>
              <div className="row row--c">
                <button type="button" className="btn" onClick={() => setNextDifficulty(true)}>{t('player.yesEasier')}</button>
                <button type="button" className="btn alt" onClick={() => setNextDifficulty(false)}>{t('player.noNormal')}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {paused && (
        <Overlay label={t('player.pausedLabel')} top>
          <Mascot state="resting" size={80} />
          <h2>{t('player.pausedTitle')}</h2>
          <p>{t('player.pausedText')}</p>
          <button type="button" className="btn" onClick={resume}><Play size={16} aria-hidden="true" /> {t('common.continue')}</button>
        </Overlay>
      )}
      {confirmEnd && (
        <Overlay label={t('player.endLabel')} top>
          <h2>{t('player.endQ')}</h2>
          <p>{t('player.endText')}</p>
          <div className="row row--c">
            <button type="button" className="btn" onClick={endConfirmed}>{t('player.end')}</button>
            <button type="button" className="btn alt" onClick={() => setConfirmEnd(false)}>{t('common.back')}</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// Optional, one tap, and only what the user says. It shapes later suggestions and is never read as a health signal.
function Helpful() {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const [answered, setAnswered] = useState(false);
  const ids = [...new Set(s.mission!.items.filter((i) => i.status === 'COMPLETED' && !CHALLENGES[i.id].selfReport).map((i) => i.id))];
  if (!ids.length) return null;
  if (answered) return <p className="note" role="status">{t('player.feedback.thanks')}</p>;
  const answer = (v: 1 | 0 | -1) => {
    store.update((d) => {
      ids.forEach((id) => d.fb.push({ id, v, ts: Date.now() }));
      // Keeps the record small; only recent answers are used.
      d.fb = d.fb.slice(-60);
    });
    setAnswered(true);
  };
  return (
    <div className="fbq" role="group" aria-labelledby="fbq-t">
      <p id="fbq-t" className="fbq__q">{t('player.feedback.q', { count: ids.length })}</p>
      <div className="row row--c">
        <button type="button" className="btn sm alt" onClick={() => answer(1)}>{t('player.feedback.yes')}</button>
        <button type="button" className="btn sm alt" onClick={() => answer(0)}>{t('player.feedback.some')}</button>
        <button type="button" className="btn sm alt" onClick={() => answer(-1)}>{t('player.feedback.no')}</button>
      </div>
    </div>
  );
}

function Completion({ summary, mascotState, onClose, onNavigate }: { summary: MissionSummary; mascotState: MascotState; onClose(): void; onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const xp = useCountUp(summary.xp, 900);
  const { all, doneCount, total, quiet } = summary;
  const leave = (v: ViewId) => {
    onClose();
    onNavigate(v);
  };
  useBackHandler(() => leave('home'));
  const title = quiet ? 'player.done.quiet' : all ? (s.g === 'f' ? 'player.done.all_f' : 'player.done.all_m') : doneCount ? 'player.done.partial' : 'player.done.none';
  return (
    <div className="mp mp--finish">
      <div className="done">
        <div className="done__scene">
          <OasisBackdrop />
          <Mascot state={mascotState} size={130} label={t('common.brand')} className="done__m" />
        </div>
        <div className="done__body">
          <div className="done__lang"><LanguageSwitcher /></div>
          <h1>{t(title)}</h1>
          {!quiet && (
            <>
              <div className="res__m">
                <div><b>{t('player.done.ofTotal', { n: doneCount, total })}</b><span>{t('player.done.completed')}</span></div>
                <div><b>+{xp}</b><span>{t('common.pointsWord')}</span></div>
                <div><b>{level(s)}</b><span>{t('common.level')}</span></div>
              </div>
              <MissionTimeline items={s.mission!.items} />
              <h3>{t('player.done.whatHappened')}</h3>
            </>
          )}
          {!quiet && <StreakDone />}
          <p>{summaryLines(summary)}{t('common.sentenceEnd')}</p>
          {!quiet && <Helpful />}
          {!quiet && <h3>{t('player.done.tomorrow')}</h3>}
          <p>{summarySuggestion(summary)}</p>
          {s.prayer && <p className="note">{t('player.done.prayer')}</p>}
          {!quiet && <p className="note">{t('player.done.disclaimer')}</p>}
          <div className="row row--c">
            {s.mission!.items.some((i) => i.jn) && <button type="button" className="btn" onClick={() => leave('path')}>{t('path.see')}</button>}
            <button type="button" className={s.mission!.items.some((i) => i.jn) ? 'btn alt' : 'btn'} onClick={() => leave('chat')}>{t('player.done.chat')}</button>
            <button type="button" className="btn alt" onClick={() => leave('prog')}>{t('nav.prog')}</button>
            <button type="button" className="btn alt" onClick={() => leave('home')}>{t('nav.home')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
