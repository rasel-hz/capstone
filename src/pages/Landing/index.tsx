import {
  BarChart3, Bell, BookOpen, Brain, CarFront, Check, Clock, CloudSun, Compass, Gamepad2, Gift, Landmark, Leaf, ListChecks, MessageCircle, Moon, Smile, Sun, Target, Users, Waves,
  type LucideIcon,
} from 'lucide-react';
import { gsap } from 'gsap';
import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { playSound, prefersReduced } from '../../animations/effects';
import { isOneShot, type MascotState } from '../../components/mascot/manifest';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useAppState, useStore } from '../../context/AppStateContext';
import { LoginDialog } from '../../features/auth/AuthViews';
import { JOURNEYS } from '../../features/challenges/catalog';
import { MemoryGame } from '../../features/challenges/games';
import type { GameEnv } from '../../features/challenges/types';
import { msg } from '../../i18n';
import { startWorld, type World } from './world';

// The landing page: one ZAHO walks the visitor through eight scenes. The moving parts live in world.ts;
// this file is the markup, the text and the three small samples. Every class starts with zw-.
const STEPS: [LucideIcon, string][] = [[MessageCircle, 'chat'], [ListChecks, 'mission'], [Gamepad2, 'play'], [BarChart3, 'results'], [Gift, 'rewards']];
const MOODS: [MascotState, string][] = [['listening', '#8ecbee'], ['thinking', '#a57ff0'], ['encouraging', '#ffb347'], ['celebrating', '#ff8fab'], ['calm', '#7fd9a8'], ['concerned', '#e0a96d']];
const J_ICON: LucideIcon[] = [Target, Waves, Compass, Smile, Moon, Users, Clock, Leaf];
const J_COLOR = ['#7f6bd6', '#3f9fc9', '#d9825b', '#d8608a', '#3b4f8f', '#2f9a72', '#8a7a55', '#24785a'];
const J_SHAPE = ['28px 40px 32px 44px', '44px 26px 40px 30px', '34px 44px 26px 38px', '40px 30px 44px 26px'];
const DAY: [LucideIcon, string][] = [[Landmark, 'prayer'], [BookOpen, 'work'], [CarFront, 'driving'], [CloudSun, 'weather'], [Users, 'family'], [Moon, 'ramadan']];
const TIMES = ['dawn', 'morning', 'noon', 'afternoon', 'sunset', 'night'];
const TINT = ['#f6d7c3', '#dbeefa', '#fff0c7', '#f9e1b8', '#f3c3a8', '#2b3266'];
const NAV = ['how', 'meet', 'try', 'journeys', 'saudi'] as const;
const TABS: [LucideIcon, string][] = [[Brain, 'memory'], [Target, 'focus'], [Waves, 'breathe']];
const DIST: [LucideIcon, string, [number, number]][] = [[Bell, 'alert', [8, 12]], [MessageCircle, 'message', [62, 8]], [Gamepad2, 'video', [70, 66]], [Users, 'group', [10, 70]], [Gift, 'ad', [38, 78]]];
const css = (v: Record<string, string | number>) => v as CSSProperties;

export function Landing() {
  const { t, i18n } = useTranslation();
  const store = useStore();
  const [login, setLogin] = useState(false);
  const [menu, setMenu] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [mood, setMood] = useState<MascotState | null>(null);
  const [tab, setTab] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const reduce = !!store.getState().rm || prefersReduced();

  // The world starts once the page is laid out, and starts again in the other language (the layout flips).
  useEffect(() => {
    if (!root.current) return;
    const w = startWorld({ root: root.current, t: (k, o) => String(t(k, o)), reduce });
    world.current = w;
    return () => { w.destroy(); world.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const slot = (name: string) => root.current?.querySelector(`[data-zw="${name}"]`) ?? null;
  const go = (id: string) => {
    setMenu(false);
    root.current?.querySelector(`[data-scene="${id}"]`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  // ZAHO cheers first, then the app opens.
  function start(e: ReactMouseEvent<HTMLElement>) {
    world.current?.burstAt(e.currentTarget, 'spark');
    world.current?.excite();
    playSound(!!store.getState().snd, 'tap');
    setTimeout(() => store.update((d) => { d.started = 1; }), reduce ? 0 : 400);
  }
  function openLogin() {
    world.current?.show('greeting', true);
    setLogin(true);
  }
  function pickMood(m: MascotState) {
    setMood(m);
    world.current?.setSlot(slot('s-meet'), m);
    if (m === 'celebrating' && world.current?.docked(slot('s-meet'))) world.current.celebrate(false);
  }
  function pickJourney(i: number, el: HTMLElement) {
    const on = !picked.includes(i);
    setPicked(on ? [...picked, i] : picked.filter((x) => x !== i));
    if (!on) return;
    world.current?.burstAt(el, 'spark', 10);
    if (world.current?.docked(slot('s-journeys'))) { world.current.excite(); world.current.say(t(`journeys.items.${JOURNEYS[i].id}.name`), 1600); }
  }
  const heroKey = t('landing.heroKey');

  return (
    <div id="app">
      <div className={`zw ${menu ? 'is-menu' : ''} ${reduce ? 'zw-still' : ''}`} ref={root}>
        <div className="zw-prog" data-zw="prog" />
        <header className="zw-nav" data-zw="nav">
          <button type="button" className="brand zw-brand" onClick={() => go('hero')}>{t('common.brand')}</button>
          {/* Not a nav element: the app styles that tag as its own side bar. */}
          <div className="zw-links" role="navigation" aria-label={t('nav.label')}>
            {NAV.map((k) => <button key={k} type="button" onClick={() => go(k)}>{t(`landing.nav.${k}`)}</button>)}
          </div>
          <div className="zw-nav-end">
            <span className="zw-lang"><LanguageSwitcher /></span>
            <button type="button" className="zw-btn zw-cta-top" onClick={start}>{t('landing.ctaShort')}</button>
            <button type="button" className="zw-burger" aria-label={t('landing.menu')} aria-expanded={menu} onClick={() => setMenu(!menu)}><i /><i /><i /></button>
          </div>
        </header>
        <div className="zw-sheet" aria-hidden={!menu}>
          {NAV.map((k) => <button key={k} type="button" tabIndex={menu ? 0 : -1} onClick={() => go(k)}>{t(`landing.nav.${k}`)}</button>)}
          <span className="zw-sheet-lang"><LanguageSwitcher /></span>
          <button type="button" className="zw-btn zw-btn--lg" tabIndex={menu ? 0 : -1} onClick={start}>{t('landing.ctaShort')}</button>
        </div>

        {/* 1. The hero: an oasis with depth, and ZAHO jumping out of the water. */}
        <section className="zw-hero" data-scene="hero">
          <div className="zw-scene" aria-hidden="true">
            <div className="zw-ly zw-sun" data-zw-d="10" />
            <div className="zw-ly zw-cloud zw-c1" data-zw-d="6" /><div className="zw-ly zw-cloud zw-c2" data-zw-d="4" /><div className="zw-ly zw-cloud zw-c3" data-zw-d="3" />
            <div className="zw-ly zw-dune-far" data-zw-d="14" />
            <div className="zw-ly zw-palm zw-p1" data-zw-d="28"><PalmArt five /></div>
            <div className="zw-ly zw-palm zw-p2" data-zw-d="22"><PalmArt /></div>
            <div className="zw-ly zw-dune-near" data-zw-d="32" />
            <div className="zw-ly zw-oasis" data-zw="oasis" data-zw-d="40" />
          </div>
          <div className="zw-hero-in">
            <div className="zw-hero-copy" data-zw="heroCopy">
              <span className="zw-eyebrow">{t('landing.eyebrow')}</span>
              <h1 className="zw-h1">
                {/* Word by word, with the spaces between the words, so they rise one at a time and still read as a sentence. */}
                {t('landing.heroTitle').split(' ').map((w, i) => (
                  <Fragment key={i}>
                    {i > 0 && ' '}
                    {w.includes(heroKey)
                      ? <span className="zw-w zw-hl">{w}<svg viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true"><path d="M2 10 Q25 2 50 9 T98 7" /></svg></span>
                      : <span className="zw-w">{w}</span>}
                  </Fragment>
                ))}
              </h1>
              <p>{t('landing.heroText')}</p>
              <div className="zw-ctas">
                <button type="button" className="zw-btn zw-btn--lg" onClick={start} onPointerEnter={() => world.current?.docked(slot('s-hero')) && world.current.show('happy', true)}>{t('landing.cta')}</button>
                <button type="button" className="zw-btn zw-btn--lg zw-btn--ghost" onClick={() => go('meet')}>{t('landing.discover')}</button>
              </div>
              <button type="button" className="zw-link zw-login" onClick={openLogin}>{t('auth.login.link')}</button>
            </div>
            <div className="zw-hero-zaho"><div className="zw-slot" data-zw="s-hero" data-state="idle" style={css({ '--s': 'clamp(150px, 24vw, 280px)' })} /></div>
          </div>
          <div className="zw-cue" data-zw="cue" aria-hidden="true"><i /><span>{t('landing.cue')}</span></div>
        </section>

        {/* 2. How it works: ZAHO walks the road, and each step opens as he reaches it. */}
        <section className="zw-how" data-scene="how" data-zw="how">
          <div className="zw-how-pin" data-zw="howPin">
            <div className="zw-how-head"><span className="zw-kicker">{t('landing.k.how')}</span><h2 className="zw-title">{t('landing.howTitle')}</h2></div>
            <div className="zw-road" data-zw="roadBox">
              <svg aria-hidden="true">
                <defs><linearGradient id="zw-rg"><stop offset="0" stopColor="#a57ff0" /><stop offset="1" stopColor="#2f9a72" /></linearGradient></defs>
                <path className="zw-road-bg" data-zw="roadBg" /><path className="zw-road-dash" data-zw="roadDash" /><path className="zw-road-done" data-zw="roadDone" />
              </svg>
              <div className="zw-slot zw-walker" data-zw="walker" data-state="curious" style={css({ '--s': 'clamp(84px, 9vw, 120px)' })} />
              {STEPS.map(([Ic, k], i) => (
                <div key={k} className="zw-stop">
                  <span className="zw-n">0{i + 1}</span>
                  <div className="zw-pin"><Ic aria-hidden="true" /></div>
                  <div className="zw-txt"><h3>{t(`landing.steps.${k}.title`)}</h3><p>{t(`landing.steps.${k}.text`)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Meet ZAHO: the six moods around him. */}
        <section className="zw-sec zw-meet" data-scene="meet">
          <div className="zw-head"><span className="zw-kicker">{t('landing.k.meet')}</span><h2 className="zw-title">{t('landing.meetTitle')}</h2><p className="zw-lead">{t('landing.meetText')}</p></div>
          <div className="zw-stage" data-zw="stage">
            <div className="zw-halo" /><div className="zw-orbit" data-zw="orbit" />
            <div className="zw-slot" data-zw="s-meet" data-state="listening" style={css({ '--s': 'clamp(120px, 22vw, 250px)' })} />
            <div className="zw-moods">
              {MOODS.map(([m, c]) => (
                <button key={m} type="button" className={`zw-mood ${mood === m ? 'is-on' : ''}`} style={css({ '--c': c })} aria-pressed={mood === m} onClick={() => pickMood(m)} onMouseEnter={coarse ? undefined : () => pickMood(m)}>
                  <i />{t(`landing.meet.${m}`)}
                </button>
              ))}
            </div>
            <div className="zw-mood-cap" aria-live="polite">{mood ? t(`landing.meet.${mood}`) : ''}</div>
          </div>
        </section>

        {/* 4. Try a challenge: three samples. Nothing is saved. */}
        <section className="zw-sec zw-try" data-scene="try">
          <div className="zw-wrap zw-split">
            <div>
              <span className="zw-kicker">{t('landing.k.try')}</span><h2 className="zw-title">{t('landing.demoTitle')}</h2><p className="zw-lead zw-mb">{t('landing.demoIntro')}</p>
              <div className="zw-play" data-zw="play">
                <div className="zw-tabs" role="tablist">
                  {TABS.map(([Ic, k], i) => <button key={k} type="button" role="tab" aria-selected={tab === i} className={`zw-tab ${tab === i ? 'is-on' : ''}`} onClick={() => setTab(i)}><Ic aria-hidden="true" /><span>{t(`landing.tabs.${k}`)}</span></button>)}
                </div>
                <div className="zw-arena" aria-live="polite">
                  {tab === 0 && <MemorySample world={world} slot={() => slot('s-try')} onStart={start} />}
                  {tab === 1 && <FocusSample world={world} slot={() => slot('s-try')} />}
                  {tab === 2 && <BreatheSample world={world} slot={() => slot('s-try')} reduce={reduce} />}
                </div>
              </div>
            </div>
            <div className="zw-side"><div className="zw-slot" data-zw="s-try" data-state="curious" style={css({ '--s': 'clamp(110px, 16vw, 200px)' })} /></div>
          </div>
        </section>

        {/* 5. Journeys you choose, more than one. */}
        <section className="zw-sec zw-journeys" data-scene="journeys">
          <div className="zw-wrap zw-split">
            <div>
              <span className="zw-kicker">{t('landing.k.journeys')}</span><h2 className="zw-title">{t('landing.journeysTitle')}</h2><p className="zw-lead">{t('landing.journeysNote')}</p>
              <div className="zw-pebbles">
                {JOURNEYS.map((j, i) => {
                  const Ic = J_ICON[i % J_ICON.length];
                  const on = picked.includes(i);
                  return (
                    <button key={j.id} type="button" className={`zw-peb ${on ? 'is-on' : ''}`} aria-pressed={on} style={css({ '--c': J_COLOR[i % J_COLOR.length], '--br': J_SHAPE[i % 4] })} onClick={(e) => pickJourney(i, e.currentTarget)}>
                      <span className="zw-ico"><Ic aria-hidden="true" /></span>{t(`journeys.items.${j.id}.name`)}<span className="zw-tick"><Check aria-hidden="true" /></span>
                    </button>
                  );
                })}
              </div>
              <p className="zw-picked" aria-live="polite">{picked.length ? t('landing.picked', { count: picked.length }) : ''}</p>
            </div>
            <div className="zw-side"><div className="zw-slot" data-zw="s-journeys" data-state="encouraging" style={css({ '--s': 'clamp(110px, 16vw, 200px)' })} /></div>
          </div>
        </section>

        {/* 6. Your Saudi day: the sky moves from dawn to night as you scroll. */}
        <section className="zw-saudi" data-scene="saudi">
          <div className="zw-day-pin" data-zw="dayPin">
            <div className="zw-day-sky" data-zw="daySky" />
            <div className="zw-day-arc" aria-hidden="true"><div className="zw-orbital" data-zw="orb" /></div>
            <div className="zw-day-ground" data-zw="dayGround" />
            <div className="zw-day-in">
              <div className="zw-span"><span className="zw-kicker">{t('landing.k.saudi')}</span><h2 className="zw-title">{t('landing.saudiTitle')}</h2></div>
              <div className="zw-moments" data-zw="moments">
                {DAY.map(([Ic, k], i) => (
                  <article key={k} className={`zw-moment ${i === 5 ? 'is-night' : ''} ${i === 0 ? 'is-on' : ''}`} style={css({ '--tint': TINT[i] })}>
                    <span className="zw-time">{i === 5 ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}{t(`landing.times.${TIMES[i]}`)}</span>
                    <div className="zw-big"><Ic aria-hidden="true" /></div>
                    <h3>{t(`landing.saudi.${k}.title`)}</h3>
                    <p>{t(`landing.saudi.${k}.text`)}</p>
                  </article>
                ))}
              </div>
              <div className="zw-side"><div className="zw-slot" data-zw="s-saudi" data-state="calm" style={css({ '--s': 'clamp(110px, 16vw, 200px)' })} /></div>
              <div className="zw-dots" aria-hidden="true">{DAY.map(([, k], i) => <i key={k} className={i === 0 ? 'is-on' : ''} />)}</div>
            </div>
          </div>
        </section>

        {/* 7. To be honest: the shield draws itself. */}
        <section className="zw-sec zw-honest" data-scene="honest">
          <div className="zw-wrap zw-split">
            <div>
              <svg className="zw-shield" data-zw="shield" viewBox="0 0 120 120" aria-hidden="true"><path d="M60 10 L100 26 V58 C100 84 82 102 60 110 C38 102 20 84 20 58 V26 Z" /><path d="M42 60 L55 73 L80 46" /></svg>
              <h2 className="zw-title">{t('landing.honestTitle')}</h2>
              <p className="zw-big-p">{t('landing.honestText')}</p>
            </div>
            <div className="zw-side"><div className="zw-slot" data-zw="s-honest" data-state="calm" style={css({ '--s': 'clamp(110px, 16vw, 200px)' })} /></div>
          </div>
        </section>

        {/* 8. The ending: a night sky, lanterns, and ZAHO celebrating. The class `closing` is shared, so it isn't used here. */}
        <section className="zw-end" data-scene="end" data-zw="end">
          <div className="zw-slot" data-zw="s-end" data-state="happy" />
          <h2 data-zw="endTitle">{t('landing.closing')}</h2>
          <button type="button" className="zw-btn zw-btn--lg" onClick={start}>{t('landing.ctaShort')}</button>
          <p className="zw-foot"><button type="button" className="zw-link" onClick={openLogin}>{t('auth.login.link')}</button></p>
        </section>

        {/* The one ZAHO: the still image with live eyes, or one of the app's clips. */}
        <div className="zw-zaho" data-zw="zaho">
          <svg className="zw-ring-prog" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" /><circle className="zw-p" data-zw="ringP" cx="50" cy="50" r="46" pathLength={100} strokeDasharray="0 100" /></svg>
          <div className="zw-shadow" data-zw="zshadow" />
          <div className="zw-tilt" data-zw="ztilt"><div className="zw-hop" data-zw="zhop"><div className="zw-breathe">
            <img data-zw="zimg" alt="" />
            <svg className="zw-eyes" viewBox="0 0 1024 1024" aria-hidden="true">
              <defs>
                <clipPath id="zw-cl"><ellipse cx="351" cy="444" rx="74" ry="78" transform="rotate(-12 351 444)" /></clipPath>
                <clipPath id="zw-cr"><ellipse cx="598" cy="475" rx="80" ry="85" /></clipPath>
              </defs>
              <g clipPath="url(#zw-cl)">
                <ellipse cx="351" cy="444" rx="74" ry="78" transform="rotate(-12 351 444)" fill="#13271e" />
                <ellipse cx="355" cy="450" rx="63" ry="68" transform="rotate(-12 355 450)" fill="#fbfaf4" />
                <g data-zw="pl"><ellipse cx="374" cy="459" rx="46" ry="57" fill="#13271e" /><circle cx="388" cy="428" r="14" fill="#fff" /></g>
                <g data-zw="lidL" transform="translate(0 -170)"><rect x="260" y="250" width="190" height="200" fill="#82e4b0" /><path d="M285 450 Q351 478 425 450" stroke="#13271e" strokeWidth="9" fill="none" strokeLinecap="round" /></g>
              </g>
              <g clipPath="url(#zw-cr)">
                <ellipse cx="598" cy="475" rx="80" ry="85" fill="#13271e" />
                <ellipse cx="598" cy="480" rx="71" ry="76" fill="#fbfaf4" />
                <g data-zw="pr"><ellipse cx="601" cy="486" rx="55" ry="60" fill="#13271e" /><circle cx="607" cy="455" r="15" fill="#fff" /></g>
                <g data-zw="lidR" transform="translate(0 -180)"><rect x="510" y="270" width="180" height="210" fill="#82e4b0" /><path d="M528 480 Q598 510 668 480" stroke="#13271e" strokeWidth="9" fill="none" strokeLinecap="round" /></g>
              </g>
            </svg>
            <video data-zw="zvid" muted playsInline preload="auto" />
          </div></div></div>
          <button type="button" className="zw-hit" data-zw="zhit" aria-label={t('landing.mascotLabel')} />
        </div>
        <div className="zw-bubble" data-zw="bubble" role="status" />
      </div>
      {login && <LoginDialog onClose={() => setLogin(false)} />}
    </div>
  );
}

function PalmArt({ five = false }: { five?: boolean }) {
  return (
    <svg viewBox="0 0 220 420" width="230" height="440">
      <path d="M100 420 C96 300 104 180 112 72" stroke="#a6774a" strokeWidth="22" fill="none" strokeLinecap="round" />
      <g className="zw-fr" fill="#2a7a52">
        <path d="M112 72 C60 40 10 60 -20 110 C30 80 70 80 112 72Z" />
        <path d="M112 72 C150 30 200 40 230 90 C190 70 150 70 112 72Z" />
        <path d="M112 72 C90 20 50 0 10 10 C60 20 90 40 112 72Z" />
        {five && <path d="M112 72 C140 100 190 140 200 190 C170 140 140 110 112 72Z" />}
        <path d="M112 72 C80 100 40 150 30 200 C60 150 85 110 112 72Z" />
      </g>
    </svg>
  );
}

interface SampleProps { world: React.RefObject<World | null>; slot(): Element | null }
// A sample's words go to the big ZAHO when he's beside it; otherwise his slot just keeps the mood for later.
function useTrySay({ world, slot }: SampleProps) {
  return (text: string, state: MascotState, once = false) => {
    const w = world.current;
    if (w?.docked(slot())) { w.show(state, once); w.say(text, 3200); } else w?.setSlot(slot(), state);
  };
}

// The real memory challenge, as in the app, with its first-try accuracy.
function MemorySample(p: SampleProps & { onStart(e: ReactMouseEvent<HTMLElement>): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const say = useTrySay(p);
  const [phase, setPhase] = useState<'idle' | 'play' | 'done'>('idle');
  const [acc, setAcc] = useState(0);
  const [run, setRun] = useState(0);
  const env: GameEnv = {
    paused: false, g: s.g, hasEvent: false, sched: s.sched, rm: !!s.rm || prefersReduced(), snd: !!s.snd,
    say: (m, text) => say(text != null ? msg(text) : '', m, isOneShot(m)),
    sfx: (k) => playSound(!!s.snd, k), round: () => {},
  };
  if (phase === 'idle') {
    return (
      <>
        <p className="zw-hint">{t('landing.demoIntro')}</p>
        <button type="button" className="zw-btn zw-btn--lg" onClick={() => { setPhase('play'); say(t('landing.demoIntro'), 'thinking'); }}>{t('landing.demoStart')}</button>
        <p className="zw-note">{t('landing.sample')}</p>
      </>
    );
  }
  if (phase === 'play') {
    return (
      <div className="zw-mem">
        <MemoryGame key={run} diff="easy" env={env} onDone={(r) => {
          setAcc(r.acc ?? 0);
          setPhase('done');
          if (r.acc) { say(t('landing.demoGood'), 'happy'); if (p.world.current?.docked(p.slot())) p.world.current.celebrate(r.acc === 100); } else say(t('landing.demoSample'), 'encouraging');
        }} />
      </div>
    );
  }
  return (
    <>
      <p className="zw-hint">{t('landing.demoResult', { acc })}</p>
      <div className="zw-ctas">
        <button type="button" className="zw-btn" onClick={p.onStart}>{t('landing.cta')}</button>
        <button type="button" className="zw-btn zw-btn--ghost" onClick={() => { setRun(run + 1); setPhase('play'); }}>{t('landing.again')}</button>
      </div>
    </>
  );
}

// Tap the distractions away until only the task is left.
function FocusSample(p: SampleProps) {
  const { t } = useTranslation();
  const say = useTrySay(p);
  const [left, setLeft] = useState(DIST.map((d) => d[1]));
  const [gone, setGone] = useState<string[]>([]);
  const field = useRef<HTMLDivElement>(null);
  // In a context that's reverted on cleanup: killing the tween alone would leave the buttons at scale 0
  // (and React starts this twice in development), so they'd never show.
  useEffect(() => {
    if (!field.current || prefersReduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.zw-dist', { scale: 0 }, { scale: 1, stagger: 0.1, duration: 0.5, ease: 'back.out(2.5)', delay: 0.2, clearProps: 'transform' });
    }, field);
    return () => ctx.revert();
  }, []);
  function clear(k: string, el: HTMLElement) {
    p.world.current?.burstAt(el, 'spark', 8);
    setGone((g) => [...g, k]);
    setTimeout(() => {
      setLeft((l) => {
        const next = l.filter((x) => x !== k);
        if (!next.length) { say(t('landing.focusDone'), 'happy'); if (p.world.current?.docked(p.slot())) p.world.current.celebrate(false); } else if (p.world.current?.docked(p.slot())) p.world.current.show('encouraging');
        return next;
      });
    }, 380);
  }
  return (
    <>
      <p className="zw-hint">{t('landing.focusHint')}</p>
      <div className="zw-focus" ref={field}>
        <div className={`zw-task ${left.length ? '' : 'is-clear'}`}>{t('landing.focusTask')}</div>
        {DIST.filter(([, k]) => left.includes(k)).map(([Ic, k, [x, y]], i) => (
          <button key={k} type="button" className={`zw-dist ${gone.includes(k) ? 'is-gone' : ''}`} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * -0.3}s` }} onClick={(e) => clear(k, e.currentTarget)}>
            <Ic aria-hidden="true" />{t(`landing.dist.${k}`)}
          </button>
        ))}
      </div>
      {!left.length && <button type="button" className="zw-btn zw-btn--ghost" onClick={() => { setLeft(DIST.map((d) => d[1])); setGone([]); }}>{t('landing.again')}</button>}
      <p className="zw-note">{t('landing.sample')}</p>
    </>
  );
}

// Breathe with the circle, three times.
function BreatheSample(p: SampleProps & { reduce: boolean }) {
  const { t } = useTranslation();
  const say = useTrySay(p);
  const orb = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; gsap.killTweensOf(orb.current); }, []);
  async function run() {
    stop.current = false;
    setBusy(true);
    say(t('landing.breathHint'), 'calm');
    const step = (txt: string, sc: number, ms: number) => new Promise<void>((res) => {
      if (stop.current) return res();
      setLabel(txt);
      gsap.to(orb.current, { scale: p.reduce ? 1 : sc, duration: ms / 1000, ease: 'sine.inOut', onComplete: () => res() });
    });
    for (let i = 0; i < 3 && !stop.current; i++) {
      await step(t('landing.breathIn'), 1.45, 4000);
      await step(t('landing.breathHold'), 1.45, 1500);
      await step(t('landing.breathOut'), 1, 4500);
    }
    if (stop.current) return;
    setLabel('');
    setBusy(false);
    setDone(true);
    say(t('landing.breathDone'), 'happy');
    if (p.world.current?.docked(p.slot())) p.world.current.celebrate(false);
  }
  return (
    <>
      <p className="zw-hint">{t('landing.breathHint')}</p>
      <div className="zw-breath"><div className="zw-ring2" /><div className="zw-orb" ref={orb} /><b aria-live="polite">{label}</b></div>
      <button type="button" className="zw-btn" disabled={busy} onClick={() => void run()}>{t(done ? 'landing.again' : 'landing.demoStart')}</button>
      <p className="zw-note">{t('landing.sample')}</p>
    </>
  );
}
