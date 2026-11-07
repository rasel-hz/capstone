import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { startAmbient } from '../../../animations/effects';
import { Palm } from '../ChallengeArt';
import type { GameProps } from '../types';

// Staying a little while is the completion rule, so the reward isn't for tapping straight through.
export const MIN_STAY_SEC = 20;
const LANTERNS = [{ x: 150, y: 150 }, { x: 330, y: 132 }, { x: 490, y: 154 }];

export function CalmLandscapeGame({ env, onDone }: GameProps) {
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
    env.say('calm', 'خذ لك لحظة. ما فيه شي لازم تسويه.');
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
    onDone({ acc: null, retries: 0, mood: 'calm', say: 'الله يعطيك العافية.', data: { help, secs, touches: touches.current } });
  }

  if (phase === 'ask') {
    return (
      <div className="scene q">
        <h2 className="q__t">كيف كان البريك؟</h2>
        <div className="choices choices--3">
          {[['y', 'ارتحت'], ['s', 'شوي'], ['n', 'ما فرق']].map(([k, l]) => <button key={k} type="button" className="opt" onClick={() => answer(k)}>{l}</button>)}
        </div>
        <div className="row row--c"><button type="button" className="btn-link" onClick={() => answer(null)}>أفضّل ما أجاوب</button></div>
      </div>
    );
  }

  const canEnd = secs >= MIN_STAY_SEC;
  return (
    <div className="scene land">
      <div className={`land__stage ${dusk ? 'is-dusk' : ''}`}>
        <svg viewBox="0 0 640 360" role="img" aria-label="واحة هادية فيها فوانيس ونخل وماء">
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
          <button key={i} type="button" className="land__hit" style={{ left: `${(l.x / 640) * 100}%`, top: `${(l.y / 360) * 100}%` }} aria-label={`الفانوس ${i + 1}`} aria-pressed={lit[i]} onClick={() => { touch(); setLit(lit.map((v, x) => (x === i ? !v : v))); }} />
        ))}
        <button type="button" className="land__hit land__hit--water" aria-label="الماء" onClick={() => ripple(200 + Math.random() * 240, 296 + Math.random() * 20)} />
        <button type="button" className="land__hit land__hit--palm" aria-label="النخلة" onClick={() => { touch(); setSway((v) => (v ? 0 : 7)); }} />
      </div>
      <div className="land__ctl">
        <button type="button" className="btn sm alt" aria-pressed={dusk} onClick={() => { touch(); setDusk(!dusk); }}>{dusk ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />} {dusk ? 'نهار' : 'مساء'}</button>
        {env.snd && <button type="button" className="btn sm alt" aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />} صوت هادي</button>}
        <button type="button" className="btn sm" disabled={!canEnd} onClick={() => setPhase('ask')}>خلص بريكي</button>
      </div>
      <p className="note center">{canEnd ? 'خذ وقتك، وارجع لما تحس إنك جاهز.' : 'اضغط الفوانيس أو الماء أو النخلة، أو بس خلك تشوف. زر الإنهاء يجهز بعد لحظات.'}</p>
    </div>
  );
}
