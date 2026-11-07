import { Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tr } from '../../../i18n';
import type { GameProps } from '../types';

interface Result { est: number; act: number; err: number }

const REFLECT = ['fast', 'slow', 'same'];
const secs = (n: number) => tr('common.seconds', { count: n });

// The display hides the running time on purpose: seeing the seconds would remove the estimate.
export function TimeGame({ env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [est, setEst] = useState(0);
  const [phase, setPhase] = useState<'guess' | 'ready' | 'running' | 'stopped'>('guess');
  const [res, setRes] = useState<Result | null>(null);
  const elapsed = useRef(0);
  const since = useRef(0);

  useEffect(() => {
    env.say('curious', 'games.time.intro');
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
    env.say('happy', a > est ? 'games.time.over' : a < est ? 'games.time.under' : 'games.time.exact');
  }

  function finish(reflect: string | null) {
    const r = res as Result;
    onDone({
      acc: null,
      retries: 0,
      say: r.act > r.est ? 'games.time.over' : 'games.time.goodEstimate',
      note: () => tr('games.time.note', { est: secs(r.est), act: secs(r.act), err: secs(r.err) }),
      data: { ...r, reflect },
    });
  }

  if (phase === 'guess') {
    return (
      <div className="scene q">
        <h2 className="q__t">{t('games.time.question')}</h2>
        <div className="est">
          {[5, 10, 15, 20].map((v) => (
            <button key={v} type="button" className="est__b" aria-label={secs(v)} onClick={() => { setEst(v); setPhase('ready'); }}>
              <b>{v}</b><span>{t('common.secondsUnit', { count: v })}</span>
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
        <h2 className="q__t">{t('games.time.diff', { err: secs(res.err) })}</h2>
        <div className="cmp" role="img" aria-label={t('games.time.compareLabel', { est: secs(res.est), act: secs(res.act) })}>
          <div className="cmp__r"><span>{t('games.time.estimate')}</span><div className="cmp__t"><i className="is-est" style={{ width: `${(res.est / max) * 100}%` }} /></div><b>{res.est} {t('common.secShort')}</b></div>
          <div className="cmp__r"><span>{t('games.time.actual')}</span><div className="cmp__t"><i className="is-act" style={{ width: `${(res.act / max) * 100}%` }} /></div><b>{res.act} {t('common.secShort')}</b></div>
        </div>
        <p className="note center">{t('games.time.explain')}</p>
        <h3 className="center">{t('games.time.reflect')}</h3>
        <div className="row row--c">
          {REFLECT.map((k) => <button key={k} type="button" className="btn sm alt" onClick={() => finish(k)}>{t(`games.time.reflections.${k}`)}</button>)}
          <button type="button" className="btn sm" onClick={() => finish(null)}>{t('common.next')}</button>
        </div>
      </div>
    );
  }

  const running = phase === 'running';
  return (
    <div className="scene time-run">
      <h2 className="q__t">{t('games.time.yourEstimate', { est: secs(est) })}</h2>
      <p className="center">{t(running ? 'games.time.countNow' : 'games.time.pressStart')}</p>
      <div className={`pulse ${running && !env.paused ? 'is-on' : ''}`} aria-hidden="true"><i /><i /><i /></div>
      <div className="row row--c">
        {running ? (
          <button type="button" className="btn btn--lg btn--stop" onClick={stop}><Square size={17} aria-hidden="true" /> {t('games.time.stop')}</button>
        ) : (
          <button type="button" className="btn btn--lg" onClick={() => { since.current = Date.now(); setPhase('running'); env.say('thinking', 'games.time.quiet'); }}><Play size={17} aria-hidden="true" /> {t('common.start')}</button>
        )}
      </div>
    </div>
  );
}
