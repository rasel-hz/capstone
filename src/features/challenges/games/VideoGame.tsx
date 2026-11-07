import { Captions, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimers } from '../../../hooks/useTimers';
import { clock } from '../../../utils';
import { COLORS } from '../catalog';
import { Palm } from '../ChallengeArt';
import type { GameProps } from '../types';
import { Choices, HintButton } from './parts';

// A clip is data: its length, captions and questions. A rights-cleared video could later use this same
// shape with a different player, without the questions pretending to be about something that isn't shown.
// Answers are stable values. Words come from the locale files when shown, so validation ignores language.
interface Question { id: string; o: string[]; a: string; color?: boolean }
interface AttentionClip { duration: number; captions: [number, string][]; questions: Question[] }

const CLIP: AttentionClip = {
  duration: 24,
  captions: [[0, 'calm'], [3, 'b1'], [6, 'r1'], [8, 'b2'], [13, 'b3'], [17, 'r2'], [21, 'end']],
  questions: [
    { id: 'balloons', o: ['2', '3', '4'], a: '3' },
    { id: 'lastColor', o: ['coral', 'yellow', 'sky'], a: 'sky', color: true },
    { id: 'birds', o: ['1', '2', '3'], a: '2' },
  ],
};
const BALLOONS = [{ t: 3, c: 0, x: 210 }, { t: 8, c: 1, x: 330 }, { t: 13, c: 2, x: 450 }];
const BIRDS = [6, 17];
const BALLOON_S = 5.5;
const BIRD_S = 5;

function OasisClip({ paused, startCc, onEnd }: { paused: boolean; startCc: boolean; onEnd(): void }) {
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
      if (l.t >= CLIP.duration) {
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

  const caption = CLIP.captions.filter((x) => x[0] <= t).pop();
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
          {BALLOONS.map((b, i) => {
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
          {BIRDS.map((b, i) => {
            const p = (t - b) / BIRD_S;
            if (p < 0 || p > 1) return null;
            const flap = Math.sin(t * 12) * 8;
            return (
              <path key={i} transform={`translate(${680 - p * 760} ${86 + Math.sin(p * 6) * 10})`} d={`M0 0q10 ${-flap - 8} 20 0q10 ${-flap - 8} 20 0`} stroke="#263D37" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            );
          })}
          <path d="M0 268q160-30 320-10t320-12v114H0z" fill="#F3D3A4" />
          <ellipse cx="320" cy="316" rx="170" ry="24" fill="#8BCDF1" />
          <Palm x={80} y={306} s={1.7} sway={sway} />
          <Palm x={566} y={302} s={1.45} sway={-sway} />
        </svg>
        {cc && caption && <div className="clip__cap">{tx(`games.video.captions.${caption[1]}`)}</div>}
      </div>
      <div className="clip__ctl">
        <button type="button" aria-label={tx(playing ? 'games.video.pause' : 'games.video.play')} onClick={() => setPlaying((v) => !v)}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <button type="button" aria-label={tx('games.video.restart')} onClick={restart}><RotateCcw size={18} /></button>
        <span className="clip__time">{clock(Math.floor(t))} / {clock(CLIP.duration)}</span>
        <div className="bar clip__bar"><i style={{ width: `${Math.min(100, (t / CLIP.duration) * 100)}%`, transition: 'none' }} /></div>
        <button type="button" aria-label={tx('games.video.captionsToggle')} aria-pressed={cc} className={cc ? 'on' : ''} onClick={() => setCc((v) => !v)}><Captions size={18} /></button>
      </div>
      <p className="note center">{tx('games.video.clipNote')}</p>
    </div>
  );
}

export function VideoGame({ diff, env, onDone }: GameProps) {
  const { t } = useTranslation();
  const questions = CLIP.questions.slice(0, diff === 'easy' ? 2 : 3);
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

  if (view === 'clip') return <OasisClip paused={env.paused} startCc={env.rm} onEnd={() => { setBad([]); setView('ask'); }} />;
  return (
    <div className="scene q" key={i}>
      <h2 className="q__t">{t(`games.video.questions.${q.id}.q`)}</h2>
      <Choices cols={3}>
        {q.o.map((o) => (
          <button key={o} type="button" className={`opt ${ok === o ? 'ok' : ''} ${bad.includes(o) ? 'no' : ''}`} disabled={!!ok || bad.includes(o)} onClick={() => choose(o)}>{q.color ? t(`games.colors.${o}`) : o}</button>
        ))}
      </Choices>
      <p className="hint" role="status">{wrong || hint ? t(`games.video.questions.${q.id}.hint`) : ''}</p>
      <div className="row row--c">
        <HintButton used={hint} disabled={!!ok || wrong} onClick={() => setHint(true)} />
        <button type="button" className="btn sm alt" disabled={!!ok} onClick={() => setView('clip')}><RotateCcw size={15} aria-hidden="true" /> {t('games.video.replay')}</button>
      </div>
    </div>
  );
}
