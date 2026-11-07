import { Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../types';

interface Result { est: number; act: number; err: number }

// Arabic counts: 3 to 10 take the plural.
const secs = (n: number) => (n <= 10 ? `${n} ثواني` : `${n} ثانية`);
const REFLECT: [string, string][] = [['fast', 'حسيته مر بسرعة'], ['slow', 'حسيته طويل'], ['same', 'زي ما توقعت']];

// The display hides the running time on purpose: seeing the seconds would remove the estimate.
export function TimeGame({ env, onDone }: GameProps) {
  const [est, setEst] = useState(0);
  const [phase, setPhase] = useState<'guess' | 'ready' | 'running' | 'stopped'>('guess');
  const [res, setRes] = useState<Result | null>(null);
  const elapsed = useRef(0);
  const since = useRef(0);

  useEffect(() => {
    env.say('curious', 'قدّر الوقت أول.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    if (env.paused) {
      if (since.current) elapsed.current += Date.now() - since.current;
      since.current = 0;
    } else if (!since.current) {
      since.current = Date.now();
    }
  }, [env.paused, phase]);

  function stop() {
    const a = (elapsed.current + (since.current ? Date.now() - since.current : 0)) / 1000;
    const r = { est, act: +a.toFixed(1), err: +Math.abs(est - a).toFixed(1) };
    setRes(r);
    setPhase('stopped');
    env.sfx('ok');
    env.say('happy', a > est ? 'أخذت أكثر من توقعك شوي. عادي، الوقت يجري.' : a < est ? 'خلصت قبل توقعك.' : 'طابق توقعك بالضبط.');
  }

  function finish(reflect: string | null) {
    const r = res as Result;
    onDone({
      acc: null,
      retries: 0,
      say: r.act > r.est ? 'أخذت أكثر من توقعك شوي. عادي، الوقت يجري.' : 'حلو التقدير.',
      note: `توقعك ${secs(r.est)}، والفعلي ${r.act} ثانية. الفرق ${r.err} ثانية.`,
      data: { ...r, reflect },
    });
  }

  if (phase === 'guess') {
    return (
      <div className="scene q">
        <h2 className="q__t">كم ثانية تتوقع تاخذ منك: تعدّ بصوت واطي من ١ إلى ١٠؟</h2>
        <div className="est">
          {[5, 10, 15, 20].map((v) => (
            <button key={v} type="button" className="est__b" onClick={() => { setEst(v); setPhase('ready'); }}>
              <b>{v}</b><span>{v <= 10 ? 'ثواني' : 'ثانية'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'stopped' && res) {
    const max = Math.max(res.est, res.act, 1);
    return (
      <div className="scene time-res">
        <h2 className="q__t">الفرق {res.err} ثانية</h2>
        <div className="cmp" role="img" aria-label={`توقعك ${secs(res.est)}، والفعلي ${res.act} ثانية`}>
          <div className="cmp__r"><span>توقعك</span><div className="cmp__t"><i className="is-est" style={{ width: `${(res.est / max) * 100}%` }} /></div><b>{res.est} ث</b></div>
          <div className="cmp__r"><span>الفعلي</span><div className="cmp__t"><i className="is-act" style={{ width: `${(res.act / max) * 100}%` }} /></div><b>{res.act} ث</b></div>
        </div>
        <p className="note center">الفرق هو المسافة بين توقعك والوقت الفعلي. هذا للمتابعة بس، مو مقياس صحي.</p>
        <h3 className="center">كيف حسيت بالوقت؟ (اختياري)</h3>
        <div className="row row--c">
          {REFLECT.map(([k, l]) => <button key={k} type="button" className="btn sm alt" onClick={() => finish(k)}>{l}</button>)}
          <button type="button" className="btn sm" onClick={() => finish(null)}>التالي</button>
        </div>
      </div>
    );
  }

  const running = phase === 'running';
  return (
    <div className="scene time-run">
      <h2 className="q__t">توقعك {secs(est)}</h2>
      <p className="center">{running ? 'عدّ الحين من ١ إلى ١٠، وأول ما تخلص اضغط وقّف.' : 'اضغط ابدأ وعدّ من ١ إلى ١٠، وبعدها وقّف.'}</p>
      <div className={`pulse ${running && !env.paused ? 'is-on' : ''}`} aria-hidden="true"><i /><i /><i /></div>
      <div className="row row--c">
        {running ? (
          <button type="button" className="btn btn--lg btn--stop" onClick={stop}><Square size={17} aria-hidden="true" /> وقّف</button>
        ) : (
          <button type="button" className="btn btn--lg" onClick={() => { since.current = Date.now(); setPhase('running'); env.say('thinking', 'أنا ساكت وأنت تعد...'); }}><Play size={17} aria-hidden="true" /> ابدأ</button>
        )}
      </div>
    </div>
  );
}
