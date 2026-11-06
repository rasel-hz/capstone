import { useEffect, useRef, useState } from 'react';
import { useTimers } from '../../../hooks/useTimers';
import { byGender } from '../../../utils';
import { COLORS } from '../catalog';
import type { GameProps } from '../types';

const DURATION = 24;
const EVENTS = [
  { k: 'b', t: 3, c: 0 }, { k: 'b', t: 8, c: 1 }, { k: 'b', t: 13, c: 2 }, { k: 'r', t: 6, c: 0 }, { k: 'r', t: 17, c: 0 },
];
const CAPTIONS: [number, string][] = [
  [0, 'نهار هادي في الواحة'], [3, 'بالون يطلع للسما'], [6, 'طير يعبر'], [8, 'بالون ثاني'], [13, 'بالون ثالث'], [17, 'طير ثاني يعبر'], [21, 'نهاية المقطع'],
];
const QUESTIONS = [
  { q: 'كم بالون طلع للسما؟', o: ['2', '3', '4'], a: '3', h: 'عدّ البالونات الملونة اللي طلعت.' },
  { q: 'وش لون آخر بالون؟', o: ['مرجاني', 'أصفر', 'سماوي'], a: 'سماوي', h: 'آخر بالون كان بلون السما.' },
  { q: 'كم مرة عبر الطير؟', o: ['1', '2', '3'], a: '2', h: 'عبر طير في بداية المقطع، وطير ثاني بعده.' },
];

function OasisClip({ paused, onEnd }: { paused: boolean; onEnd(): void }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [cc, setCc] = useState(false);
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

  const caption = CAPTIONS.filter((x) => x[0] <= t).pop();
  return (
    <>
      <div className="vid">
        <div className="vid__sand" />
        <div className="vid__sun" />
        <div className="vid__palm">🌴</div>
        {EVENTS.map((e, i) => {
          const p = (t - e.t) / 5;
          if (p < 0 || p > 1) return null;
          return e.k === 'b' ? (
            <svg key={i} width="36" height="52" viewBox="0 0 36 52" style={{ insetInlineStart: `${18 + e.c * 24}%`, top: `${100 - p * 125}%` }}>
              <ellipse cx="18" cy="18" rx="15" ry="18" fill={COLORS[e.c]} />
              <path d="M18 36v14" stroke="#263D37" />
            </svg>
          ) : (
            <svg key={i} width="40" height="20" viewBox="0 0 40 20" style={{ top: '16%', insetInlineStart: `${-10 + p * 115}%` }}>
              <path d="M2 14q9-14 18 0q9-14 18 0" stroke="#263D37" strokeWidth="3" fill="none" />
            </svg>
          );
        })}
        {cc && <div className="cap">{caption?.[1]}</div>}
        <div className="vc">
          <button type="button" aria-label="تشغيل أو إيقاف" onClick={() => setPlaying((v) => !v)}>{playing ? '⏸' : '▶'}</button>
          <div className="bar"><i style={{ width: `${Math.min(100, (t / DURATION) * 100)}%`, transition: 'none' }} /></div>
          <button type="button" aria-label="الترجمة" aria-pressed={cc} onClick={() => setCc((v) => !v)}>CC</button>
        </div>
      </div>
      <p className="note">ركّز على البالونات والطيور</p>
    </>
  );
}

export function VideoGame({ diff, env, onDone }: GameProps) {
  const questions = QUESTIONS.slice(0, diff === 'easy' ? 2 : 3);
  const timers = useTimers(env.paused);
  const [view, setView] = useState<'clip' | 'ask'>('clip');
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [bad, setBad] = useState<string[]>([]);
  const [ok, setOk] = useState<string | null>(null);
  const firstTry = useRef(0);
  const retries = useRef(0);
  const q = questions[i];

  useEffect(() => {
    env.say('listening', byGender(env.g, 'يلا يا بطل، ركّز في المقطع زين، وبعدها أسألك عن كم شي.', 'يلا يا بطلة، ركّزي في المقطع زين، وبعدها أسألك عن كم شي.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(o: string) {
    if (ok) return;
    if (o === q.a) {
      setOk(o);
      env.sfx('ok');
      if (!wrong) firstTry.current++;
      env.say('happy', wrong ? 'كذا! جربت مرة ثانية وضبطت.' : 'يا سلام عليك! والله إنك كفو!');
      timers.after(() => {
        if (i + 1 < questions.length) {
          setI(i + 1);
          setWrong(false);
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
    env.say('encouraging', byGender(env.g, 'عوافي يا بطل، خذ راحتك. تذكر وش شفت بالمقطع وجرب مرة ثانية.', 'عوافي يا بطلة، خذي راحتك. تذكري وش شفتي بالمقطع وجربي مرة ثانية.'));
  }

  if (view === 'clip') return <OasisClip paused={env.paused} onEnd={() => { setBad([]); setView('ask'); }} />;
  return (
    <div className="scene" key={i}>
      <h2>{q.q}</h2>
      {q.o.map((o) => (
        <button key={o} type="button" className={`opt ${ok === o ? 'ok' : ''} ${bad.includes(o) ? 'no' : ''}`} disabled={!!ok || bad.includes(o)} onClick={() => choose(o)}>{o}</button>
      ))}
      <p className="note" role="status">{wrong ? q.h : ''}</p>
      {wrong && <button type="button" className="btn sm alt" onClick={() => setView('clip')}>شوف المقطع مرة ثانية</button>}
    </div>
  );
}
