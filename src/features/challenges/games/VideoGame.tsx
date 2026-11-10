import { Captions, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimers } from '../../../hooks/useTimers';
import { clock } from '../../../utils';
import { COLORS } from '../catalog';
import { Palm } from '../ChallengeArt';
import type { GameProps } from '../types';
import { Choices, HintButton } from './parts';
import { BALLOON_S, BIRD_S, CAMEL_S, captions, DURATION, freshScene, pickQuestions, signature, STAR_S, type VQuestion, type VScene } from './videoScene';

// Each play is a new scene from videoScene.ts, never the same one twice in a row, with questions worked out
// from what was really shown. Answers are stable values; words come from the locale files when shown.
const LAST_KEY = 'kw-video-last';
function lastSignature(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
function remember(sc: VScene) {
  try {
    localStorage.setItem(LAST_KEY, signature(sc));
  } catch {
    // Without storage a repeat is just less likely to be avoided.
  }
}
const BIRD_INK = ['#263D37', '#7A5C3E', '#3E5C76'];
const BIRD_SIZE = [1, 1.3, 0.8];
const PALM_AT: [number, number, number][] = [[80, 306, 1.7], [566, 302, 1.45], [250, 300, 1.2]];

function OasisClip({ sc, paused, startCc, onEnd }: { sc: VScene; paused: boolean; startCc: boolean; onEnd(): void }) {
  const { t: tx } = useTranslation();
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [cc, setCc] = useState(startCc);
  const live = useRef({ t: 0, run: true, ended: false });
  live.current.run = playing && !paused;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const l = live.current;
      if (l.run) {
        l.t += Math.min(dt, 0.1);
        setT(l.t);
      }
      if (l.t >= DURATION) {
        if (!l.ended) {
          l.ended = true;
          onEnd();
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function restart() {
    live.current.t = 0;
    setT(0);
    setPlaying(true);
  }

  const caption = captions(sc).filter((x) => x[0] <= t).pop();
  const sway = Math.sin(t * 0.9) * 3;
  return (
    <div className="clip">
      <div className="clip__stage">
        <svg viewBox="0 0 640 360" role="img" aria-label={tx('games.video.sceneLabel')}>
          <rect width="640" height="360" fill="#CFE9FF" />
          <circle cx="540" cy="64" r="34" fill="#FFD36E" />
          <g opacity=".9" transform={`translate(${(t * 3) % 80 - 40} 0)`}>
            <ellipse cx="150" cy="60" rx="46" ry="14" fill="#fff" /><ellipse cx="180" cy="50" rx="30" ry="14" fill="#fff" />
            <ellipse cx="400" cy="92" rx="38" ry="11" fill="#fff" />
          </g>
          <path d="M0 214q160-58 320-16t320-24v186H0z" fill="#F7DDB6" />
          {sc.star && t >= sc.star.t && t <= sc.star.t + STAR_S && (
            <path transform={`translate(${sc.star.x} 46) scale(${0.8 + Math.sin(((t - sc.star.t) / STAR_S) * Math.PI) * 0.5})`} opacity={Math.sin(((t - sc.star.t) / STAR_S) * Math.PI)} d="M0-14l4 9 10 1-7.5 7 2 10L0 8l-8.5 5 2-10L-14-4l10-1z" fill="#FFD36E" stroke="#E0A93B" strokeWidth="1.2" />
          )}
          {sc.balloons.map((b, i) => {
            const p = (t - b.t) / BALLOON_S;
            if (p < 0 || p > 1) return null;
            const y = 300 - p * 370;
            const x = b.x + Math.sin(t * 1.4 + i) * 10;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <ellipse cx="0" cy="0" rx="24" ry="30" fill={COLORS[b.c]} />
                <ellipse cx="-8" cy="-10" rx="5" ry="8" fill="#fff" opacity=".45" />
                <path d="M0 30q-5 12 0 26" stroke="#263D37" strokeWidth="1.5" fill="none" />
              </g>
            );
          })}
          {sc.birds.map((b, i) => {
            const p = (t - b.t) / BIRD_S;
            if (p < 0 || p > 1) return null;
            const flap = Math.sin(t * 12) * 8;
            const x = b.from === 'right' ? 680 - p * 760 : -80 + p * 760;
            return (
              <path key={i} transform={`translate(${x} ${70 + i * 18 + Math.sin(p * 6) * 10}) scale(${BIRD_SIZE[b.k]})`} d={`M0 0q10 ${-flap - 8} 20 0q10 ${-flap - 8} 20 0`} stroke={BIRD_INK[b.k]} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            );
          })}
          <path d="M0 268q160-30 320-10t320-12v114H0z" fill="#F3D3A4" />
          <ellipse cx="320" cy="316" rx="170" ry="24" fill="#8BCDF1" />
          {sc.camel && t >= sc.camel.t && t <= sc.camel.t + CAMEL_S && (() => {
            const p = (t - sc.camel.t) / CAMEL_S;
            const right = sc.camel.from === 'right';
            const x = right ? 700 - p * 780 : -60 + p * 780;
            const bob = Math.sin(t * 6) * 1.5;
            return (
              <g transform={`translate(${x} ${246 + bob}) scale(${right ? 1 : -1} 1)`} fill="#C69C6D">
                <ellipse cx="0" cy="0" rx="26" ry="13" /><ellipse cx="-2" cy="-12" rx="12" ry="9" />
                <path d="M-22-4q-12-10-14-26l6-2q4 12 14 20z" /><ellipse cx="-38" cy="-30" rx="8" ry="4.5" />
                <rect x="-20" y="8" width="4" height="22" rx="2" /><rect x="-9" y="8" width="4" height="22" rx="2" />
                <rect x="8" y="8" width="4" height="22" rx="2" /><rect x="18" y="8" width="4" height="22" rx="2" />
              </g>
            );
          })()}
          {PALM_AT.slice(0, sc.palms).map(([x, y, k], i) => <Palm key={i} x={x} y={y} s={k} sway={i % 2 ? -sway : sway} />)}
        </svg>
        {cc && caption && <div className="clip__cap">{tx(`games.video.captions.${caption[1]}`, caption[2] ? { color: tx(`games.colors.${caption[2].color}`) } : {})}</div>}
      </div>
      <div className="clip__ctl">
        <button type="button" aria-label={tx(playing ? 'games.video.pause' : 'games.video.play')} onClick={() => setPlaying((v) => !v)}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <button type="button" aria-label={tx('games.video.restart')} onClick={restart}><RotateCcw size={18} /></button>
        <span className="clip__time">{clock(Math.floor(t))} / {clock(DURATION)}</span>
        <div className="bar clip__bar"><i style={{ width: `${Math.min(100, (t / DURATION) * 100)}%`, transition: 'none' }} /></div>
        <button type="button" aria-label={tx('games.video.captionsToggle')} aria-pressed={cc} className={cc ? 'on' : ''} onClick={() => setCc((v) => !v)}><Captions size={18} /></button>
      </div>
      <p className="note center">{tx('games.video.clipNote')}</p>
    </div>
  );
}

export function VideoGame({ diff, env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [{ sc, questions }] = useState(() => {
    const scene = freshScene(diff === 'easy', lastSignature());
    remember(scene);
    return { sc: scene, questions: pickQuestions(scene, diff === 'easy') };
  });
  const timers = useTimers(env.paused);
  const [view, setView] = useState<'clip' | 'ask'>('clip');
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [hint, setHint] = useState(false);
  const [bad, setBad] = useState<string[]>([]);
  const [ok, setOk] = useState<string | null>(null);
  const firstTry = useRef(0);
  const retries = useRef(0);
  const q = questions[i];

  useEffect(() => {
    env.say('listening', env.g === 'f' ? 'games.video.intro_f' : 'games.video.intro_m');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view === 'ask') {
      env.round(i + 1, questions.length, 'games.common.question');
      if (!wrong) env.say('curious', 'games.video.askIntro');
    } else {
      env.round(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, i]);

  function choose(o: string) {
    if (ok) return;
    if (o === q.a) {
      setOk(o);
      env.sfx('ok');
      // Accuracy is first try without help, as the result screen says.
      if (!wrong && !hint) firstTry.current++;
      env.say('happy', wrong ? 'games.video.rightAfterRetry' : 'games.video.right');
      timers.after(() => {
        if (i + 1 < questions.length) {
          setI(i + 1);
          setWrong(false);
          setHint(false);
          setBad([]);
          setOk(null);
        } else {
          onDone({ acc: Math.round((firstTry.current / questions.length) * 100), retries: retries.current });
        }
      }, 1200);
      return;
    }
    setBad((b) => [...b, o]);
    setWrong(true);
    retries.current++;
    env.sfx('bad');
    env.say('encouraging', env.g === 'f' ? 'games.video.wrong_f' : 'games.video.wrong_m');
  }

  if (view === 'clip') return <OasisClip sc={sc} paused={env.paused} startCc={env.rm} onEnd={() => { setBad([]); setView('ask'); }} />;
  const params = q.p?.color ? { color: t(`games.colors.${q.p.color}`) } : {};
  return (
    <div className="scene q" key={i}>
      <h2 className="q__t">{t(`games.video.questions.${q.id}.q`, params)}</h2>
      <Choices cols={q.o.length === 2 ? 2 : 3}>
        {q.o.map((o) => (
          <button key={o} type="button" className={`opt ${ok === o ? 'ok' : ''} ${bad.includes(o) ? 'no' : ''}`} disabled={!!ok || bad.includes(o)} onClick={() => choose(o)}>{optionLabel(q, o, t)}</button>
        ))}
      </Choices>
      <p className="hint" role="status">{wrong || hint ? t(`games.video.questions.${q.id}.hint`, params) : ''}</p>
      <div className="row row--c">
        <HintButton used={hint} disabled={!!ok || wrong} onClick={() => setHint(true)} />
        <button type="button" className="btn sm alt" disabled={!!ok} onClick={() => setView('clip')}><RotateCcw size={15} aria-hidden="true" /> {t('games.video.replay')}</button>
      </div>
    </div>
  );
}

function optionLabel(q: VQuestion, o: string, t: (k: string) => string) {
  if (q.kind === 'color') return t(`games.colors.${o}`);
  if (q.kind === 'dir') return t(`games.video.dirs.${o}`);
  if (q.kind === 'yesno') return t(`games.video.yesno.${o}`);
  if (q.kind === 'kind') return t(`games.video.kinds.${o}`);
  return o;
}
