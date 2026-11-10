import { Brain, Eye, Footprints, Moon, Sun, Sunset, Volume2, VolumeX, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { startAmbient } from '../../../animations/effects';
import type { GameResult } from '../../../types';
import { Palm } from '../ChallengeArt';
import type { GameProps } from '../types';
import { CalmGame } from './CalmGame';
import { EyeBreakGame } from './EyeBreakGame';
import { AskNext, Ring } from './parts';

// Staying a little while is the completion rule, so the reward isn't for tapping straight through.
export const MIN_STAY_SEC = 20;
const LANTERNS = [{ x: 150, y: 150 }, { x: 330, y: 132 }, { x: 490, y: 154 }];

export type Need = 'eyes' | 'move' | 'mind' | 'quiet';
const NEEDS: { id: Need; i: LucideIcon }[] = [{ id: 'eyes', i: Eye }, { id: 'move', i: Footprints }, { id: 'mind', i: Brain }, { id: 'quiet', i: Sunset }];
const isNeed = (v: unknown): v is Need => NEEDS.some((n) => n.id === v);
// Four gentle moves, half a minute each.
const MOVES = ['neck', 'shoulders', 'stretch', 'walk'] as const;
const MOVE_SEC = 30;

/**
 * "A break your way" (calm_landscape). One question first: what do you need right now? Rest the eyes (the eye break), move a
 * little, a busy mind (the breathing from "Take it easy"), or just quiet (the oasis). After a focus session
 * it offers another session at the end. A need chosen elsewhere, such as in "How do you feel?", skips the question.
 */
export function CalmLandscapeGame(props: GameProps) {
  const { t } = useTranslation();
  const { env, onDone, seed } = props;
  const [need, setNeed] = useState<Need | null>(isNeed(seed?.option) ? seed.option : null);
  const [held, setHeld] = useState<GameResult | null>(null);

  useEffect(() => {
    if (!need) env.say('curious', 'games.landscape.pickSay');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a focus session, the break ends with the way back.
  const end = (r: GameResult) => {
    const res = { ...r, data: { need, ...(r.data as object) } };
    if (seed?.from === 'study_sprint') setHeld(res);
    else onDone(res);
  };

  if (held) {
    return (
      <AskNext
        q={t('games.study.againQ')}
        yes={t('games.study.againYes')}
        no={t('games.study.againNo')}
        onYes={() => onDone({ ...held, then: { id: 'study_sprint', seed: { task: seed?.task, from: 'calm_landscape' } } })}
        onNo={() => onDone(held)}
      />
    );
  }

  if (!need) {
    return (
      <div className="scene q">
        <h2 className="q__t">{t('games.landscape.pickQ')}</h2>
        <div className="choices choices--2">
          {NEEDS.map(({ id, i: Ic }) => (
            <button key={id} type="button" className="opt opt--icon" onClick={() => { env.sfx('tap'); setNeed(id); }}>
              <Ic size={20} aria-hidden="true" /> {t(`games.landscape.needs.${id}`)}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (need === 'mind') return <CalmGame {...props} onDone={end} />;
  if (need === 'eyes') return <EyeBreakGame {...props} onDone={end} />;
  if (need === 'move') return <TimedBreak steps={[...MOVES]} sec={MOVE_SEC} kind="moves" env={env} onDone={end} />;
  return <Oasis env={env} onDone={end} />;
}

// One or more short timed steps with a ring, then "how was it?".
function TimedBreak({ steps, sec, kind, env, onDone }: { steps: string[]; sec: number; kind: 'moves'; env: GameProps['env']; onDone(r: GameResult): void }) {
  const { t } = useTranslation();
  const prefix = `games.landscape.${kind}`;
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(sec);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (asking) return;
    env.round(i + 1, steps.length, 'games.common.step');
    env.say('calm', `${prefix}.${steps[i]}.say`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, asking]);

  useEffect(() => {
    if (asking || env.paused) return;
    const iv = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(iv);
  }, [asking, env.paused]);

  useEffect(() => {
    if (asking || left > 0) return;
    env.sfx('tap');
    if (i + 1 < steps.length) {
      setI(i + 1);
      setLeft(sec);
    } else {
      setAsking(true);
      env.round(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (asking) return <HowWasIt q={`${prefix}.after`} onAnswer={(help) => onDone({ acc: null, retries: 0, mood: 'calm', say: 'games.landscape.done', data: { help } })} />;
  return (
    <div className="scene timer-v">
      <h2 className="q__t">{t(`${prefix}.${steps[i]}.title`)}</h2>
      <Ring value={Math.max(0, left) / sec} size={180}>
        <span className="timer-big" role="timer">{Math.max(0, left)}</span>
      </Ring>
      <p className="center">{t(`${prefix}.${steps[i]}.how`)}</p>
      <div className="row row--c"><button type="button" className="btn-link" onClick={() => setLeft(0)}>{t(i + 1 < steps.length ? 'common.next' : 'games.landscape.end')}</button></div>
    </div>
  );
}

function HowWasIt({ q, onAnswer }: { q: string; onAnswer(help: string | null): void }) {
  const { t } = useTranslation();
  return (
    <div className="scene q">
      <h2 className="q__t">{t(q)}</h2>
      <div className="choices choices--3">
        {['y', 's', 'n'].map((k) => <button key={k} type="button" className="opt" onClick={() => onAnswer(k)}>{t(`games.common.help.${k}`)}</button>)}
      </div>
      <div className="row row--c"><button type="button" className="btn-link" onClick={() => onAnswer(null)}>{t('games.common.preferNot')}</button></div>
    </div>
  );
}

// Just quiet: the oasis to look at or touch.
function Oasis({ env, onDone }: { env: GameProps['env']; onDone(r: GameResult): void }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'scene' | 'ask'>('scene');
  const [dusk, setDusk] = useState(false);
  const [lit, setLit] = useState<boolean[]>([false, false, false]);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [sway, setSway] = useState(0);
  const [sound, setSound] = useState(false);
  const [secs, setSecs] = useState(0);
  const touches = useRef(0);
  const nextId = useRef(0);

  useEffect(() => {
    env.say('calm', 'games.landscape.intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'scene' || env.paused) return;
    const iv = setInterval(() => setSecs((v) => v + 1), 1000);
    return () => clearInterval(iv);
  }, [phase, env.paused]);

  // The sound runs only while it's on, the scene is showing and the game isn't paused.
  useEffect(() => {
    if (!sound || env.paused || phase !== 'scene') return;
    return startAmbient();
  }, [sound, env.paused, phase]);

  const touch = () => { touches.current++; };

  function ripple(x: number, y: number) {
    touch();
    const id = nextId.current++;
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((v) => v.id !== id)), 1600);
  }

  function answer(help: string | null) {
    onDone({ acc: null, retries: 0, mood: 'calm', say: 'games.landscape.done', data: { help, secs, touches: touches.current } });
  }

  if (phase === 'ask') return <HowWasIt q="games.landscape.how" onAnswer={answer} />;

  const canEnd = secs >= MIN_STAY_SEC;
  return (
    <div className="scene land">
      <div className={`land__stage ${dusk ? 'is-dusk' : ''}`}>
        <svg viewBox="0 0 640 360" role="img" aria-label={t('games.landscape.sceneLabel')}>
          <rect width="640" height="360" fill={dusk ? '#6C63B8' : '#CFE9FF'} className="land__sky" />
          {dusk ? [[80, 50], [200, 90], [420, 40], [540, 90], [300, 30]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.5" fill="#FFFDF8" />) : <circle cx="530" cy="70" r="36" fill="#FFD36E" />}
          {dusk && <path d="M556 92A32 32 0 1 1 526 44a26 26 0 0 0 30 48z" fill="#FFD36E" />}
          <path d="M0 200q160-60 320-16t320-24v200H0z" fill={dusk ? '#A594D6' : '#F7DDB6'} />
          <path d="M0 250q160-30 320-10t320-12v132H0z" fill={dusk ? '#8476C2' : '#F3D3A4'} />
          <g>
            <ellipse cx="320" cy="306" rx="210" ry="38" fill={dusk ? '#5B7FC2' : '#8BCDF1'} />
            {ripples.map((r) => <circle key={r.id} className="ripple" cx={r.x} cy={r.y} r="26" fill="none" stroke="#FFFDF8" strokeWidth="2.5" />)}
          </g>
          <Palm x={84} y={290} s={1.8} sway={sway} />
          <Palm x={570} y={288} s={1.5} sway={-sway} />
          {LANTERNS.map((l, i) => (
            <g key={i} transform={`translate(${l.x} ${l.y})`}>
              {lit[i] && <circle r="34" fill="#FFD36E" opacity=".3" />}
              <path d="M0-26V-10" stroke="#263D37" strokeWidth="2" />
              <rect x="-10" y="-10" width="20" height="26" rx="6" fill={lit[i] ? '#FFD36E' : '#E9DFFF'} stroke="#263D37" strokeOpacity=".3" />
            </g>
          ))}
        </svg>
        {LANTERNS.map((l, i) => (
          <button key={i} type="button" className="land__hit" style={{ left: `${(l.x / 640) * 100}%`, top: `${(l.y / 360) * 100}%` }} aria-label={t('games.landscape.lantern', { n: i + 1 })} aria-pressed={lit[i]} onClick={() => { touch(); setLit(lit.map((v, x) => (x === i ? !v : v))); }} />
        ))}
        <button type="button" className="land__hit land__hit--water" aria-label={t('games.landscape.water')} onClick={() => ripple(200 + Math.random() * 240, 296 + Math.random() * 20)} />
        <button type="button" className="land__hit land__hit--palm" aria-label={t('games.landscape.palm')} onClick={() => { touch(); setSway((v) => (v ? 0 : 7)); }} />
      </div>
      <div className="land__ctl">
        <button type="button" className="btn sm alt" aria-pressed={dusk} onClick={() => { touch(); setDusk(!dusk); }}>{dusk ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />} {t(dusk ? 'games.landscape.day' : 'games.landscape.evening')}</button>
        {env.snd && <button type="button" className="btn sm alt" aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />} {t('games.landscape.sound')}</button>}
        <button type="button" className="btn sm" disabled={!canEnd} onClick={() => setPhase('ask')}>{t('games.landscape.end')}</button>
      </div>
      <p className="note center">{t(canEnd ? 'games.landscape.ready' : 'games.landscape.guide')}</p>
    </div>
  );
}
