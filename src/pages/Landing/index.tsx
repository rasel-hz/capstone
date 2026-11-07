import { BookOpen, CarFront, CloudSun, Moon, Users, type LucideIcon, Landmark, MessageCircle, ListChecks, Gamepad2, BarChart3, Gift, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { playSound, prefersReduced } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import { isOneShot, type MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { IconBadge } from '../../components/ui/kit';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useAppState, useStore } from '../../context/AppStateContext';
import { JourneyArt, OasisBackdrop } from '../../features/challenges/ChallengeArt';
import { JOURNEYS } from '../../features/challenges/catalog';
import { MemoryGame } from '../../features/challenges/games';
import type { GameEnv } from '../../features/challenges/types';
import { msg, type Msg } from '../../i18n';

const MEET: MascotState[] = ['listening', 'thinking', 'encouraging', 'celebrating', 'calm', 'concerned'];
const STEPS: [LucideIcon, string][] = [[MessageCircle, 'chat'], [ListChecks, 'mission'], [Gamepad2, 'play'], [BarChart3, 'results'], [Gift, 'rewards']];
const SAUDI: [LucideIcon, string][] = [[Landmark, 'prayer'], [CarFront, 'driving'], [Users, 'family'], [Moon, 'ramadan'], [BookOpen, 'work'], [CloudSun, 'weather']];
const CYCLE: MascotState[] = ['curious', 'happy', 'celebrating', 'greeting', 'encouraging'];

function PreviewGame({ onStart }: { onStart(): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const [phase, setPhase] = useState<'idle' | 'play' | 'done'>('idle');
  const [acc, setAcc] = useState(0);
  const [mood, setMood] = useState<MascotState>('curious');
  const [bubble, setBubble] = useState<Msg>('landing.demoIntro');
  const mascot = useMascot(mood);
  const say = useCallback((m: MascotState, text?: Msg) => {
    if (text != null) setBubble(() => text);
    if (isOneShot(m)) mascot.play(m);
    else setMood(m);
  }, [mascot.play]);
  const env: GameEnv = { paused: false, g: s.g, hasEvent: false, sched: s.sched, rm: !!s.rm || prefersReduced(), snd: !!s.snd, say, sfx: (k) => playSound(!!s.snd, k), round: () => {} };
  return (
    <div className="preview">
      <div className="cb">
        <Mascot state={mascot.state} size={72} still={phase === 'play'} />
        <div className="bub" aria-live="polite">{msg(bubble)}</div>
      </div>
      {phase === 'idle' && <div className="center"><button type="button" className="btn btn--lg" onClick={() => setPhase('play')}>{t('landing.demoStart')}</button></div>}
      {phase === 'play' && (
        <MemoryGame diff="easy" env={env} onDone={(r) => { setAcc(r.acc ?? 0); setPhase('done'); say(r.acc ? 'happy' : 'encouraging', r.acc ? 'landing.demoGood' : 'landing.demoSample'); }} />
      )}
      {phase === 'done' && (
        <div className="center">
          <p>{t('landing.demoResult', { acc })}</p>
          <button type="button" className="btn btn--lg" onClick={onStart}>{t('landing.cta')}</button>
        </div>
      )}
    </div>
  );
}

export function Landing() {
  const { t } = useTranslation();
  const store = useStore();
  const hero = useMascot('idle');
  const [cycle, setCycle] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const start = () => store.update((d) => { d.started = 1; });

  useEffect(() => {
    hero.play('greeting');
  }, [hero.play]);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && x.target.classList.add('v')), { threshold: 0.12 });
    root.current?.querySelectorAll('.rv').forEach((x) => io.observe(x));
    return () => io.disconnect();
  }, []);

  function poke() {
    const next = (cycle + 1) % CYCLE.length;
    setCycle(next);
    hero.play(CYCLE[next]);
    playSound(!!store.getState().snd, 'tap');
  }

  return (
    <div id="app">
      <div className="lp" ref={root}>
        <header className="lt">
          <b className="brand">{t('common.brand')}</b>
          <div className="lt__end">
            <LanguageSwitcher />
            <button type="button" className="btn sm" onClick={start}>{t('landing.ctaShort')}</button>
          </div>
        </header>

        <section className="lh">
          <OasisBackdrop className="lh__bg" />
          <div className="lh__in">
            <div className="lh__txt">
              <p className="eyebrow">{t('landing.eyebrow')}</p>
              <h1>{t('landing.heroTitle')}</h1>
              <p className="lh__p">{t('landing.heroText')}</p>
              <div className="row">
                <button type="button" className="btn btn--lg" onClick={start} onMouseEnter={() => hero.play('happy')} onFocus={() => hero.play('happy')}>{t('landing.cta')}</button>
                <button type="button" className="btn btn--lg alt" onClick={() => document.getElementById('meet')?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth' })}>{t('landing.discover')}</button>
              </div>
            </div>
            <div className="lh__m">
              <Mascot state={hero.state} size={230} interactive onClick={poke} label={t('landing.mascotLabel')} />
              <p className="note center">{t('landing.tapHint')}</p>
            </div>
          </div>
        </section>

        <section className="ls rv">
          <h2 className="ls__t">{t('landing.howTitle')}</h2>
          <ol className="flow">
            {STEPS.map(([Icon, k], i) => (
              <li key={k}><span className="flow__n" aria-hidden="true">{i + 1}</span><IconBadge icon={Icon} tone="lil" size={20} /><h3>{t(`landing.steps.${k}.title`)}</h3><p className="note flush">{t(`landing.steps.${k}.text`)}</p></li>
            ))}
          </ol>
        </section>

        <section id="meet" className="ls rv">
          <div className="ls__split">
            <div>
              <h2 className="ls__t">{t('landing.meetTitle')}</h2>
              <p>{t('landing.meetText')}</p>
            </div>
            <ul className="meet">{MEET.map((m) => <li key={m}><Mascot state={m} size={78} interactive /><span>{t(`landing.meet.${m}`)}</span></li>)}</ul>
          </div>
        </section>

        <section className="ls rv">
          <h2 className="ls__t">{t('landing.demoTitle')}</h2>
          <PreviewGame onStart={start} />
        </section>

        <section className="ls rv">
          <h2 className="ls__t">{t('landing.journeysTitle')}</h2>
          <p className="note">{t('landing.journeysNote')}</p>
          <div className="lj">{JOURNEYS.map((j) => <div key={j.id} className="lj__c"><div className="lj__art"><JourneyArt id={j.id} /></div><b>{t(`journeys.items.${j.id}.name`)}</b></div>)}</div>
        </section>

        <section className="ls rv">
          <h2 className="ls__t">{t('landing.saudiTitle')}</h2>
          <div className="saudi">{SAUDI.map(([Icon, k]) => <div key={k}><IconBadge icon={Icon} tone="sage" size={20} /><div><h3>{t(`landing.saudi.${k}.title`)}</h3><p className="note flush">{t(`landing.saudi.${k}.text`)}</p></div></div>)}</div>
        </section>

        <section className="ls rv">
          <div className="honest">
            <IconBadge icon={ShieldCheck} tone="em" size={22} />
            <div>
              <h2>{t('landing.honestTitle')}</h2>
              <p>{t('landing.honestText')}</p>
            </div>
          </div>
        </section>

        <section className="ls rv center closing">
          <Mascot state="happy" size={130} />
          <h2>{t('landing.closing')}</h2>
          <button type="button" className="btn btn--lg" onClick={start}>{t('landing.ctaShort')}</button>
        </section>
      </div>
    </div>
  );
}
